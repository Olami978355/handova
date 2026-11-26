import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createAdminClient, getServiceRoleKey } from '../_shared/supabase.ts'
import { corsHeaders } from '../_shared/utils.ts'

const json = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  })

// Chat is push + in-app only, never email.

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  try {
    const supabaseClient = createAdminClient()
    const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
    if (!token) return json({ error: 'Authorization required' }, 401)

    const input = await req.json()
    let { title, body } = input
    const { user_id, user_ids, link, type } = input
    const targetUserIds: string[] = user_ids || (user_id ? [user_id] : [])
    if (targetUserIds.length === 0) {
      return json({ error: 'No user_id or user_ids provided' }, 400)
    }

    const serviceKey = getServiceRoleKey()
    if (token !== serviceKey) {
      // Browser callers: chat notifications only, between two participants of the conversation.
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
      if (authError || !user) return json({ error: 'Authentication failed' }, 401)

      const m = typeof link === 'string' ? link.match(/^\/messages\?id=([0-9a-fA-F-]{36})$/) : null
      if (type !== 'new_message' || targetUserIds.length !== 1 || !m) {
        return json({ error: 'Not allowed' }, 403)
      }
      const { data: conv } = await supabaseClient
        .from('conversations').select('participant_ids').eq('id', m[1]).single()
      const ids: string[] = conv?.participant_ids || []
      if (!ids.includes(user.id) || !ids.includes(targetUserIds[0]) || targetUserIds[0] === user.id) {
        return json({ error: 'Not allowed' }, 403)
      }
      title = 'New Message'
      body = String(body ?? '').slice(0, 100)
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

    return json({ success: true, data })
  } catch (error) {
    return json({ error: (error as Error).message }, 500)
  }
})
