import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createSupabaseClient, createAdminClient, getServiceRoleKey } from '../_shared/supabase.ts';
import { logDealAction, notifyDealParties, corsHeaders } from '../_shared/utils.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createSupabaseClient(req);
    const adminSupabase = createAdminClient();
    const { dealId } = await req.json();

    // 1. Verify caller authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    // 2. Fetch deal details
    const { data: deal, error: dealError } = await adminSupabase
      .from('deals')
      .select('*, properties(*)')
      .eq('id', dealId)
      .single();

    if (dealError || !deal) throw new Error('Deal not found');

    // 2.1 Verify deal status
if (deal.status !== 'payment_received') {
  throw new Error(`Cannot sign agreement in ${deal.status} status`);
}

    // 2.2 Verify agreement exists
    if (!deal.agreement_url) {
      throw new Error('Agreement has not been uploaded yet');
    }

    // 3. Validate caller has permission (landlord or tenant)
    if (user.id !== deal.landlord_id && user.id !== deal.tenant_id) {
      throw new Error('Permission denied');
    }

    // 3.1 Check if already signed
    const isTenant = user.id === deal.tenant_id;
    const isLandlord = user.id === deal.landlord_id;

    if (isTenant && deal.tenant_signed_at) throw new Error('Tenant has already signed');
    if (isLandlord && deal.landlord_signed_at) throw new Error('Landlord has already signed');

    // 4. Update deal with signature
    const updateData: any = { updated_at: new Date().toISOString() };

    if (isTenant) {
      updateData.tenant_signed_at = new Date().toISOString();
    } else if (isLandlord) {
      updateData.landlord_signed_at = new Date().toISOString();
    }

    // Check if both have signed
    const tenantSigned = updateData.tenant_signed_at || deal.tenant_signed_at;
    const landlordSigned = updateData.landlord_signed_at || deal.landlord_signed_at;
    const bothSigned = !!(tenantSigned && landlordSigned);
    
    if (bothSigned) {
      updateData.status = 'agreement_signed';
    }

    const { error: updateError } = await adminSupabase
      .from('deals')
      .update(updateData)
      .eq('id', dealId);

    if (updateError) throw updateError;

    // 5. Log action
    await logDealAction(adminSupabase, dealId, 'agreement_signed', user.id, {
      signer_role: isTenant ? 'tenant' : 'landlord',
      both_signed: bothSigned,
    });

    // 6. Notify parties
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = getServiceRoleKey();

    if (bothSigned) {
      await notifyDealParties(
        adminSupabase,
        deal,
        'Agreement Fully Signed',
        `Agreement for ${deal.properties.title} is fully signed. Move-in can now be scheduled.`,
        `/dashboard/deals/${dealId}`,
        'deal_state_change'
      );
    } else {
      // Notify the other party
      const targetId = isTenant ? deal.landlord_id : deal.tenant_id;
      
      if (supabaseUrl && serviceRoleKey) {
        await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({
            user_id: targetId,
            title: 'Agreement Signed',
            body: `${isTenant ? 'Tenant' : 'Landlord'} has signed the agreement for ${deal.properties.title}.`,
            link: `/dashboard/deals/${dealId}`,
            type: 'deal_state_change',
          }),
        });
        
        if (deal.agent_id) {
          await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${serviceRoleKey}`,
            },
            body: JSON.stringify({
              user_id: deal.agent_id,
              title: 'Agreement Signed',
              body: `${isTenant ? 'Tenant' : 'Landlord'} has signed the agreement for ${deal.properties.title}.`,
              link: `/dashboard/deals/${dealId}`,
              type: 'deal_state_change',
            }),
          });
        }
      }
    }

    return new Response(JSON.stringify({ success: true, both_signed: !!(tenantSigned && landlordSigned) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Sign agreement error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
