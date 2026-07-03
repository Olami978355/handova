import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createSupabaseClient, createAdminClient } from '../_shared/supabase.ts';
import { corsHeaders } from '../_shared/utils.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createSupabaseClient(req);
    const adminSupabase = createAdminClient();
    const { accountNumber, bankCode, accountName } = await req.json();

    // 1. Verify caller authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    if (!accountNumber || !bankCode || !accountName) {
      throw new Error('accountNumber, bankCode, and accountName are required');
    }

    const paystackSecret = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!paystackSecret) throw new Error('PAYSTACK_SECRET_KEY not set');

    // 2. Create a Paystack transfer recipient now, so release-funds later
    // just reads a cached recipient_code instead of creating one on the fly.
    const recipientRes = await fetch('https://api.paystack.co/transferrecipient', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${paystackSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'nuban',
        name: accountName,
        account_number: accountNumber,
        bank_code: bankCode,
        currency: 'NGN',
      }),
    });
    const recipientData = await recipientRes.json();

    if (!recipientData.status) {
      throw new Error(recipientData.message || 'Failed to register bank account with Paystack');
    }

    const recipientCode = recipientData.data.recipient_code;

    // 3. Save bank details + recipient code to the profile
    const { error: updateError } = await adminSupabase
      .from('profiles')
      .update({
        bank_account_name: accountName,
        bank_account_number: accountNumber,
        bank_code: bankCode,
        paystack_recipient_code: recipientCode,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) throw updateError;

    return new Response(JSON.stringify({
      success: true,
      recipientCode,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Save bank details error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
