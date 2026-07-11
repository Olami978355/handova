import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createAdminClient } from '../_shared/supabase.ts'


const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createAdminClient()
    const { requestId, userId, action, notes } = await req.json()

    // Get admin user from auth header
    const authHeader = req.headers.get('Authorization')!
    const { data: { user: adminUser }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authError || !adminUser) throw new Error('Unauthorized')

    // Check if admin/moderator
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', adminUser.id)
      .single()

    if (!['admin', 'moderator'].includes(adminProfile?.role)) {
      throw new Error('Unauthorized: Admin or Moderator role required')
    }

    if (action === 'approve') {
      // 1. Update profile status
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ verification_status: 'verified' })
        .eq('id', userId)
      if (profileError) throw profileError

      // 2. Update request status
      const { error: requestError } = await supabase
        .from('verification_requests')
        .update({ status: 'approved', updated_at: new Date().toISOString() })
        .eq('id', requestId)
      if (requestError) throw requestError

      // 3. Log action
      await supabase.from('admin_logs').insert({
        actor_id: adminUser.id,
        action: 'approve_verification',
        target_id: userId,
        details: { requestId, userId }
      })

      // 4. Send notification
      await supabase.from('notifications').insert({
        user_id: userId,
        title: 'Verification Approved!',
        message: 'Your identity has been verified. You can now list properties and perform transactions.',
        type: 'verification_approved'
      })

    } else if (action === 'reject') {
      // 1. Update profile status
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ verification_status: 'rejected' })
        .eq('id', userId)
      if (profileError) throw profileError

      // 2. Update request status
      const { error: requestError } = await supabase
        .from('verification_requests')
        .update({ status: 'rejected', notes, updated_at: new Date().toISOString() })
        .eq('id', requestId)
      if (requestError) throw requestError

      // 3. Log action
      await supabase.from('admin_logs').insert({
        actor_id: adminUser.id,
        action: 'reject_verification',
        target_id: userId,
        details: { requestId, userId, reason: notes }
      })

      // 4. Send notification
      await supabase.from('notifications').insert({
        user_id: userId,
        title: 'Verification Rejected',
        message: `Your verification was rejected. Reason: ${notes}. Please re-submit with correct information.`,
        type: 'verification_rejected'
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
