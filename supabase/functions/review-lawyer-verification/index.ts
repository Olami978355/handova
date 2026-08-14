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
      throw new Error('Permission denied. Only admins or moderators can review lawyer verifications.');
    }

    const { data: lawyerRequest, error: reqError } = await adminSupabase
      .from('lawyer_verifications')
      .select('*')
      .eq('id', requestId)
      .single();

    if (reqError || !lawyerRequest) throw new Error('Lawyer verification request not found');

    if (lawyerRequest.status !== 'pending') {
      throw new Error(`This request has already been ${lawyerRequest.status}.`);
    }

    const newStatus = decision === 'approve' ? 'approved' : 'rejected';

    const { error: updateReqError } = await adminSupabase
      .from('lawyer_verifications')
      .update({
        status: newStatus,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        rejection_reason: decision === 'reject' ? rejectionReason : null,
      })
      .eq('id', requestId);
    if (updateReqError) throw updateReqError;

    if (decision === 'approve') {
      const { error: updateProfileError } = await adminSupabase
        .from('profiles')
        .update({ is_lawyer: true })
        .eq('id', lawyerRequest.user_id);
      if (updateProfileError) throw updateProfileError;
    }

    await adminSupabase.from('admin_audit_logs').insert({
      action: `lawyer_verification_${newStatus}`,
      performed_by: user.id,
      target_type: 'lawyer_verification',
      target_id: requestId,
      details: { user_id: lawyerRequest.user_id, reason: rejectionReason ?? null },
    });

    await adminSupabase.from('notifications').insert({
      user_id: lawyerRequest.user_id,
      title: decision === 'approve' ? 'Lawyer Verification Approved 🎉' : 'Lawyer Verification Update',
      body: decision === 'approve'
        ? 'You are now a verified lawyer on Handova. You can be found and booked from the lawyer directory.'
        : `Your lawyer verification was not approved. Reason: ${rejectionReason}`,
      type: decision === 'approve' ? 'lawyer_verification_approved' : 'lawyer_verification_rejected',
      link: '/lawyer/verification',
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Review lawyer verification error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
