import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createAdminClient, getServiceRoleKey } from '../_shared/supabase.ts'
import { sendEmail } from '../_shared/utils.ts'

// Types that also get an email. Everything else: in-app bell + push only.
// ('info' and 'inspection_confirmed' are NOT here on purpose: their functions send their own email.)
const EMAIL_TYPES = new Set([
  'custom_deal_offer', 'deal_created', 'interested', 'declined',
  'verification_approved', 'verification_rejected',
  'listing_approved', 'listing_rejected',
  'security_alert', 'bank_details',
  'lawyer_verification', 'lawyer_review_booked', 'lawyer_consultation_booked', 'lawyer_review_expired',
])
// Money/security emails ignore the user's email switch.
const ALWAYS_EMAIL = new Set(['security_alert', 'bank_details'])

const ok = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), { headers: { 'Content-Type': 'application/json' }, status })

serve(async (req) => {
  try {
    const expected = Deno.env.get('DISPATCH_WEBHOOK_SECRET')
    if (!expected || req.headers.get('x-webhook-secret') !== expected) {
      return ok({ error: 'Not allowed' }, 403)
    }

    const payload = await req.json()
    const n = payload?.record
    if (payload?.type !== 'INSERT' || !n?.user_id || !n?.title) {
      return ok({ ignored: true })
    }

    const admin = createAdminClient()
    const { data: prof } = await admin
      .from('profiles')
      .select('email, full_name, notify_email, notify_push')
      .eq('id', n.user_id)
      .maybeSingle()
    if (!prof) return ok({ ignored: 'no profile' })

    // Push
    if (prof.notify_push !== false) {
      try {
        await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-push-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getServiceRoleKey()}`,
          },
          body: JSON.stringify({ user_id: n.user_id, title: n.title, body: n.body || n.title, url: n.link || '/dashboard' }),
        })
      } catch (e) {
        console.error('dispatch push failed (non-fatal):', e)
      }
    }

    // Email
    const wantsEmail = EMAIL_TYPES.has(n.type) && (ALWAYS_EMAIL.has(n.type) || prof.notify_email !== false)
    if (wantsEmail && prof.email) {
      try {
        await sendEmail(prof.email, n.title, 'notification', {
          full_name: prof.full_name,
          title: n.title,
          body: n.body,
          link: n.link,
        })
      } catch (e) {
        console.error('dispatch email failed (non-fatal):', e)
      }
    }

    return ok({ success: true })
  } catch (error) {
    console.error('dispatch-notification error:', error)
    return ok({ error: (error as Error).message }, 500)
  }
})
