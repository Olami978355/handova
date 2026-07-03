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
    const { requestId, docType } = await req.json();

    const allowedDocTypes = ['nin_doc_url', 'business_reg_url', 'lasrera_doc_url'];
    if (!allowedDocTypes.includes(docType)) {
      throw new Error('Invalid document type requested');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    const { data: callerProfile, error: callerError } = await adminSupabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (callerError || !callerProfile || (callerProfile.role !== 'admin' && callerProfile.role !== 'moderator')) {
      throw new Error('Permission denied. Only admins or moderators can view verification documents.');
    }

    const { data: verificationRequest, error: reqError } = await adminSupabase
      .from('verification_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (reqError || !verificationRequest) throw new Error('Verification request not found');

    const filePath = verificationRequest[docType] as string | null;
    if (!filePath) throw new Error(`No ${docType} on file for this request`);

    let objectPath = filePath;
    const bucketMarker = '/verification-docs/';
    if (filePath.includes(bucketMarker)) {
      objectPath = filePath.split(bucketMarker)[1].split('?')[0];
    }

    const { data: signedData, error: signedError } = await adminSupabase.storage
      .from('verification-docs')
      .createSignedUrl(objectPath, 60 * 10);

    if (signedError) throw signedError;

    // Audit log — who viewed which document, when. Non-blocking: a logging
    // failure should never prevent a legitimate document review.
    try {
      await adminSupabase.from('admin_audit_logs').insert({
        action: 'verification_doc_viewed',
        performed_by: user.id,
        target_type: 'verification_request',
        target_id: requestId,
        details: { doc_type: docType },
      });
    } catch (logErr) {
      console.error('Audit log insert failed (non-fatal):', logErr);
    }

    return new Response(JSON.stringify({ success: true, url: signedData.signedUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Admin view verification doc error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
