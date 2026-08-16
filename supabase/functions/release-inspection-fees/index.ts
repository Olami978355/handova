import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createAdminClient } from '../_shared/supabase.ts';
import { corsHeaders, executeInspectionFeeTransfer } from '../_shared/utils.ts';

// Cron-triggered. Finds inspection bookings whose agreed date has passed
// and whose fee is still sitting with Handova (awaiting_release), and
// releases the 85% payout to whoever did the work — agent, or landlord
// if there's no agent. Skips anything disputed, declined, or refunded,
// since those bookings should never release funds automatically.
const SYSTEM_ACTOR_ID = '00000000-0000-0000-0000-000000000000';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createAdminClient();
    const now = new Date().toISOString();

    const { data: dueBookings, error: fetchError } = await supabase
      .from('inspection_bookings')
      .select('*')
      .eq('transfer_status', 'awaiting_release')
      .lte('release_at', now)
      .not('status', 'in', '(dispute_raised,tenant_declined,refunded,dispute_resolved)');

    if (fetchError) throw fetchError;

    const results = [];
    for (const booking of dueBookings || []) {
      try {
        const payoutResult = await executeInspectionFeeTransfer(supabase, booking, SYSTEM_ACTOR_ID);
        results.push({ id: booking.id, ...payoutResult });
      } catch (err) {
        console.error(`Failed to release fee for booking ${booking.id}:`, err);
        results.push({ id: booking.id, error: String(err) });
      }
    }

    return new Response(JSON.stringify({ success: true, processed: results.length, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('release-inspection-fees error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
