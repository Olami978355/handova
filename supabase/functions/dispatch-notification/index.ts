import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createAdminClient, getServiceRoleKey } from '../_shared/supabase.ts'
import { sendEmail } from '../_shared/utils.ts'

const CRITICAL_TRANSACTION_TYPES = new Set([
  'inspection_requested',
  'inspection_booked',
  'inspection_confirmed',
  'deal_state_change',
  'custom_deal_offer',
  'refund_processed',
  'refund_attention',
  'lawyer_review_submitted',
  'lawyer_review_expired',
  'lawyer_verification_approved',
  'lawyer_verification_rejected',
  'verification_approved',
  'verification_rejected',
  'security_alert',
])

const EMAIL_TYPES = new Set([
  ...CRITICAL_TRANSACTION_TYPES,
  'deal_created',
  'interested',
  'declined',
  'verification_approved',
  'verification_rejected',
  'listing_approved',
  'listing_rejected',
  'security_alert',
  'bank_details',
  'lawyer_verification',
  'lawyer_review_booked',
  'lawyer_consultation_booked',
  'lawyer_review_expired',
])

const ALWAYS_EMAIL = new Set([
  ...CRITICAL_TRANSACTION_TYPES,
  'security_alert',
  'bank_details',
])

const ok = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    headers: { 'Content-Type': 'application/json' },
    status,
  })

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

    const criticalTransaction = CRITICAL_TRANSACTION_TYPES.has(n.type)

    // Critical transaction alerts bypass the ordinary push preference.
    if (criticalTransaction || prof.notify_push !== false) {
      try {
        const response = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-push-notification`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${getServiceRoleKey()}`,
            },
            body: JSON.stringify({
              user_id: n.user_id,
              title: n.title,
              body: n.body || n.title,
              url: n.link || '/dashboard',
            }),
          },
        )

        if (!response.ok) {
          console.error('Push endpoint returned:', response.status, await response.text())
        }
      } catch (e) {
        console.error('Dispatch push failed (non-fatal):', e)
      }
    }

    // Critical transaction emails bypass the ordinary email preference.
    // inspection_confirmed may also have a dedicated booking email in its
    // originating workflow; verify that path before adding a second email.
    const wantsEmail =
      EMAIL_TYPES.has(n.type) &&
      (ALWAYS_EMAIL.has(n.type) || prof.notify_email !== false)

    if (wantsEmail && prof.email) {
      try {
        await sendEmail(prof.email, n.title, 'notification', {
          full_name: prof.full_name,
          title: n.title,
          body: n.body,
          link: n.link,
        })
      } catch (e) {
        console.error('Dispatch email failed (non-fatal):', e)
      }
    }

    return ok({ success: true })
  } catch (error) {
    console.error('dispatch-notification error:', error)
    return ok({ error: (error as Error).message }, 500)
  }
})
