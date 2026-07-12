import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createAdminClient } from '../_shared/supabase.ts'
import { corsHeaders, sendEmail } from '../_shared/utils.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  try {
    const supabaseClient = createAdminClient()
    const { user_id, user_ids, title, body, link, type } = await req.json()
    const targetUserIds = user_ids || (user_id ? [user_id] : [])
    if (targetUserIds.length === 0) {
      return new Response(JSON.stringify({ error: 'No user_id or user_ids provided' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }
    const notifications = targetUserIds.map((uid: string) => ({
      user_id: uid,
      title,
      body,
      link,
      type,
      read: false,
    }))
    const { data, error } = await supabaseClient
      .from('notifications')
      .insert(notifications)
      .select()
    if (error) throw error

    // Also email the recipients — was completely missing before.
    try {
      const { data: profiles } = await supabaseClient
        .from('profiles')
        .select('id, email, full_name')
        .in('id', targetUserIds)
      if (profiles) {
        for (const p of profiles) {
          if (p.email) {
            await sendEmail(p.email, title, 'notification', {
              full_name: p.full_name,
              title,
              body,
              link,
            })
          }
        }
      }
    } catch (emailErr) {
      console.error('Failed to send notification emails (non-fatal):', emailErr)
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
