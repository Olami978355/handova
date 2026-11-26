import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createAdminClient, getServiceRoleKey } from '../_shared/supabase.ts';
import { corsHeaders } from '../_shared/utils.ts';

serve(async (req) => {
  const cronSecret = Deno.env.get('CRON_SECRET')
  if (!cronSecret || req.headers.get('x-cron-secret') !== cronSecret) {
    return new Response(JSON.stringify({ error: 'Not allowed' }), { status: 403, headers: { 'Content-Type': 'application/json' } })
  }
  if (req.method === "OPTIONS") {
    return new Response('ok', { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const allowedKeys = [Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", getServiceRoleKey()].filter(Boolean);
  if (bearerToken.length === 0 || allowedKeys.includes(bearerToken) === false) {
    return new Response(JSON.stringify({ error: "Not allowed" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const supabase = createAdminClient();
    const now = new Date().toISOString();
    const { data: expiredBookings, error: fetchError } = await supabase
      .from('inspection_bookings')
      .select('*, properties(*)')
      .eq('status', 'inspection_done')
      .lt('tenant_decision_deadline', now);

    if (fetchError) throw fetchError;

    const results = [];

      for (const booking of expiredBookings || []) {
        try {
          const { data: expiredBooking, error: updateError } = await supabase
            .from("inspection_bookings")
            .update({
              status: "tenant_declined",
              notes: "Automatically declined because the tenant decision deadline expired. Inspection fees are non-refundable.",
              updated_at: new Date().toISOString(),
            })
            .eq("id", booking.id)
            .eq("status", "inspection_done")
            .lt("tenant_decision_deadline", now)
            .select("id")
            .maybeSingle();

          if (updateError) throw updateError;
          if (!expiredBooking) continue;

          const parties = [booking.tenant_id, booking.landlord_id];
          if (booking.agent_id) parties.push(booking.agent_id);

          await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-notification`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${getServiceRoleKey()}`,
            },
            body: JSON.stringify({
              user_ids: parties,
              title: "Decision Deadline Expired",
              body: `The decision deadline for ${booking.properties.title} has expired. The booking was automatically declined. Inspection fees are non-refundable.`,
              link: "/dashboard/bookings",
              type: "info",
            }),
          });

          results.push({ id: booking.id, status: "expired" });
        } catch (err) {
          console.error(`Failed to expire booking ${booking.id}:`, err);
        }
      }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Auto-expire error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
