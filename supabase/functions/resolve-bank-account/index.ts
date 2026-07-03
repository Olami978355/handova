import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createSupabaseClient } from '../_shared/supabase.ts';
import { corsHeaders } from '../_shared/utils.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createSupabaseClient(req);
    const { accountNumber, bankCode } = await req.json();

    // 1. Verify caller is authenticated (any logged-in user can resolve —
    // this just calls Paystack's public-account-name lookup, no write happens here)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    if (!accountNumber || !bankCode) {
      throw new Error('accountNumber and bankCode are required');
    }

    const paystackSecret = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!paystackSecret) throw new Error('PAYSTACK_SECRET_KEY not set');

    // 2. Ask Paystack to resolve the account number against the bank code
    const resolveRes = await fetch(
      `https://api.paystack.co/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`,
      {
        headers: { Authorization: `Bearer ${paystackSecret}` },
      }
    );
    const resolveData = await resolveRes.json();

    if (!resolveData.status) {
      throw new Error(resolveData.message || 'Could not resolve account. Check the account number and bank.');
    }

    // 3. Return the resolved name for the user to confirm — we do NOT save
    // anything here, saving happens in a separate step after user confirmation.
    return new Response(JSON.stringify({
      success: true,
      accountName: resolveData.data.account_name,
      accountNumber: resolveData.data.account_number,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Resolve bank account error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
