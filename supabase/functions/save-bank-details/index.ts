import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createSupabaseClient, createAdminClient, getServiceRoleKey } from '../_shared/supabase.ts';
import { corsHeaders } from '../_shared/utils.ts';

// Strict on purpose: case, punctuation, "&" vs "AND" and "LTD" vs "LIMITED" are ignored.
// Anything else is a mismatch and goes to admin review.
const normalizeName = (s: string) =>
  s.toUpperCase()
    .replace(/&/g, ' AND ')
    .replace(/[^A-Z0-9 ]/g, ' ')
    .replace(/\bLIMITED\b/g, 'LTD')
    .replace(/\s+/g, ' ')
    .trim();

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createSupabaseClient(req);
    const adminSupabase = createAdminClient();
    const { accountNumber, bankCode, accountName } = await req.json();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    if (!accountNumber || !bankCode || !accountName) {
      throw new Error('accountNumber, bankCode, and accountName are required');
    }

    const paystackSecret = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!paystackSecret) throw new Error('PAYSTACK_SECRET_KEY not set');

    const { data: callerProfile } = await adminSupabase
      .from('profiles').select('role').eq('id', user.id).single();
    const isCompany = callerProfile?.role === 'company';

    let recipientName: string = accountName;
    let resolvedName = '';
    let company: { name: string; verification_status: string } | null = null;

    if (isCompany) {
      // Company payouts never trust the typed name: ask the bank who owns the account.
      if (!/^\d{10}$/.test(String(accountNumber))) throw new Error('Account number must be 10 digits.');
      const { data: c } = await adminSupabase
        .from('companies').select('name, verification_status').eq('id', user.id).single();
      if (!c) throw new Error('Company profile not found.');
      company = c;

      const resolveUrl = `https://api.paystack.co/bank/resolve?account_number=${encodeURIComponent(String(accountNumber))}&bank_code=${encodeURIComponent(String(bankCode))}`;
      const doResolve = async () => (await fetch(resolveUrl, { headers: { Authorization: `Bearer ${paystackSecret}` } })).json();
      let resolved = await doResolve();
      if (!resolved.status || !resolved.data?.account_name) {
        await new Promise((r) => setTimeout(r, 1500));
        resolved = await doResolve();
      }
      if (!resolved.status || !resolved.data?.account_name) {
        console.error('Paystack resolve failed:', JSON.stringify(resolved));
        throw new Error('Could not verify this account with the bank. Check the account number and bank.');
      }
      resolvedName = resolved.data.account_name;
      recipientName = resolvedName;
    }

    // Create a Paystack transfer recipient now, so release-funds later
    // just reads a cached recipient_code instead of creating one on the fly.
    const recipientRes = await fetch('https://api.paystack.co/transferrecipient', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${paystackSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'nuban',
        name: recipientName,
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

    const { error: updateError } = await adminSupabase
      .from('profiles')
      .update({
        bank_account_name: recipientName,
        bank_account_number: accountNumber,
        bank_code: bankCode,
        paystack_recipient_code: recipientCode,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) throw updateError;

    // Company accounts: record what was checked. The payout gate only pays a recipient code
    // that matches this record, so any later change fails closed until re-verified.
    let verification: 'verified' | 'pending_review' | null = null;
    if (isCompany && company) {
      const nameMatches = normalizeName(resolvedName) === normalizeName(company.name);
      verification = nameMatches && company.verification_status === 'verified' ? 'verified' : 'pending_review';
      const nowIso = new Date().toISOString();
      const { error: checkError } = await adminSupabase
        .from('company_payout_accounts')
        .upsert({
          company_id: user.id,
          bank_code: bankCode,
          account_number: accountNumber,
          account_name_resolved: resolvedName,
          paystack_recipient_code: recipientCode,
          verification_status: verification,
          verified_by: null,
          verified_at: verification === 'verified' ? nowIso : null,
          updated_by: user.id,
          updated_at: nowIso,
        }, { onConflict: 'company_id' });
      if (checkError) throw checkError;
    }

    // Security alert: notify the account owner immediately whenever payout bank details
    // change, so an unauthorized change is noticed right away.
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = getServiceRoleKey();
    if (supabaseUrl && serviceRoleKey) {
      try {
        const reviewNote = verification === 'pending_review'
          ? ' This account is pending review before payouts can be sent to it.'
          : '';
        await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceRoleKey}` },
          body: JSON.stringify({
            user_id: user.id,
            title: 'Payout Bank Details Changed',
            body: `Your payout account was updated to ${recipientName}, account ending ${String(accountNumber).slice(-4)}.${reviewNote} If this wasn't you, contact support immediately.`,
            link: '/profile',
            type: 'security_alert',
          }),
        });
      } catch (notifyErr) {
        console.error('Failed to send bank-details-changed notification:', notifyErr);
      }
    }

    return new Response(JSON.stringify({ success: true, recipientCode, verification }), {
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
