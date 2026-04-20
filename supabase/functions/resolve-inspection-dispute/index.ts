import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createAdminClient } from '../_shared/supabase.ts';
import { corsHeaders, sendEmail } from '../_shared/utils.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createAdminClient();
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Authorization required');

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) throw new Error('Authentication failed');

    // Check if user is admin or staff
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || (profile.role !== 'admin' && profile.role !== 'staff')) {
      throw new Error('You are not authorized to resolve disputes.');
    }

    const { bookingId, resolution, landlordAtFault } = await req.json();

    // Fetch booking
    const { data: booking, error: bookingError } = await supabase
      .from('inspection_bookings')
      .select('*, properties(*), tenant:profiles!tenant_id(full_name, email), landlord:profiles!landlord_id(full_name, email)')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) throw new Error('Booking not found');

    const toKobo = (naira: number) => Math.round(naira * 100);
    const paystackSecret = Deno.env.get('PAYSTACK_SECRET_KEY');

    if (landlordAtFault) {
      // BUG FIX 6: Add strike to landlord atomically
      const { data: strikeResult, error: strikeError } = await supabase.rpc('add_strike_and_check', {
        p_landlord_id: booking.landlord_id,
        p_reason: `Dispute on booking ${bookingId}: ${resolution}`
      });

      if (strikeError) throw strikeError;

      // Refund tenant 100%
      const refundAmountKobo = toKobo(booking.inspection_fee);
      const refundResponse = await fetch('https://api.paystack.co/refund', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${paystackSecret}`,
        },
        body: JSON.stringify({
          transaction: booking.paystack_reference,
          amount: refundAmountKobo,
        }),
      });

      const refundData = await refundResponse.json();
      if (!refundResponse.ok) {
        throw new Error(`Paystack refund failed: ${refundData.message}`);
      }

      // Update booking status
      const { error: updateError } = await supabase
        .from('inspection_bookings')
        .update({ 
          status: 'dispute_resolved',
          refund_percentage: 100,
          refund_amount: booking.inspection_fee,
          paystack_refund_reference: refundData.data.reference,
          notes: `Dispute resolved in favor of tenant. Landlord at fault: ${resolution}`,
          updated_at: new Date().toISOString() 
        })
        .eq('id', bookingId);

      if (updateError) throw updateError;
    } else {
      // Tenant at fault or dispute rejected
      const { error: updateError } = await supabase
        .from('inspection_bookings')
        .update({ 
          status: 'dispute_resolved',
          notes: `Dispute resolved in favor of landlord. Tenant at fault or rejected: ${resolution}`,
          updated_at: new Date().toISOString() 
        })
        .eq('id', bookingId);

      if (updateError) throw updateError;
    }

    // Notify parties
    const parties = [booking.tenant_id, booking.landlord_id];
    if (booking.agent_id) parties.push(booking.agent_id);

    await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({
        user_ids: parties,
        title: 'Dispute Resolved',
        body: `The dispute for ${booking.properties.title} has been resolved. Resolution: ${resolution}`,
        link: `/dashboard/bookings`,
        type: 'info',
      }),
    });

    // Send Emails
    if (booking.tenant?.email) {
      await sendEmail(
        booking.tenant.email,
        'Dispute Resolved - Rent Easy',
        'dispute',
        {
          name: booking.tenant.full_name,
          propertyTitle: booking.properties.title,
          status: 'Resolved',
          message: `The dispute for ${booking.properties.title} has been resolved. Resolution: ${resolution}`,
          link: `https://renteasy.ng/dashboard/bookings`
        }
      );
    }
    if (booking.landlord?.email) {
      await sendEmail(
        booking.landlord.email,
        'Dispute Resolved - Rent Easy',
        'dispute',
        {
          name: booking.landlord.full_name,
          propertyTitle: booking.properties.title,
          status: 'Resolved',
          message: `The dispute for ${booking.properties.title} has been resolved. Resolution: ${resolution}`,
          link: `https://renteasy.ng/dashboard/bookings`
        }
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Resolve dispute error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
