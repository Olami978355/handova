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
    const { requestId, decision, rejectionReason } = await req.json();

    if (!['approve', 'reject'].includes(decision)) {
      throw new Error('decision must be "approve" or "reject"');
    }
    if (decision === 'reject' && !rejectionReason) {
      throw new Error('rejectionReason is required when rejecting');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    const { data: callerProfile, error: callerError } = await adminSupabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (callerError || !callerProfile || (callerProfile.role !== 'admin' && callerProfile.role !== 'moderator')) {
      throw new Error('Permission denied. Only admins or moderators can review verification requests.');
    }

    const { data: verificationRequest, error: reqError } = await adminSupabase
      .from('verification_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (reqError || !verificationRequest) throw new Error('Verification request not found');

    if (verificationRequest.status !== 'pending') {
      throw new Error(`This request has already been ${verificationRequest.status}.`);
    }

    const newRequestStatus = decision === 'approve' ? 'approved' : 'rejected';
    const newProfileStatus = decision === 'approve' ? 'verified' : 'rejected';

    const { error: updateReqError } = await adminSupabase
      .from('verification_requests')
      .update({
        status: newRequestStatus,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        rejection_reason: decision === 'reject' ? rejectionReason : null,
      })
      .eq('id', requestId);
    if (updateReqError) throw updateReqError;

    const { error: updateProfileError } = await adminSupabase
      .from('profiles')
      .update({ verification_status: newProfileStatus })
      .eq('id', verificationRequest.user_id);
    if (updateProfileError) throw updateProfileError;

    await adminSupabase.from('admin_audit_logs').insert({
      action: `verification_${newRequestStatus}`,
      performed_by: user.id,
      target_type: 'verification_request',
      target_id: requestId,
      details: { user_id: verificationRequest.user_id, reason: rejectionReason ?? null },
    });

    await adminSupabase.from('notifications').insert({
      user_id: verificationRequest.user_id,
      title: decision === 'approve' ? 'Verification Approved! 🎉' : 'Verification Update',
      body: decision === 'approve'
        ? 'Your identity has been verified. You now have a verified badge on your profile.'
        : `Your verification was not approved. Reason: ${rejectionReason}`,
      type: decision === 'approve' ? 'verification_approved' : 'verification_rejected',
      link: '/verification',
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Review verification request error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
