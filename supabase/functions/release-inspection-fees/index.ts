import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/utils.ts';
import { getServiceRoleKey } from "../_shared/supabase.ts";

serve(async (req) => {
  const cronSecret = Deno.env.get('CRON_SECRET')
  if (!cronSecret || req.headers.get('x-cron-secret') !== cronSecret) {
    return new Response(JSON.stringify({ error: 'Not allowed' }), { status: 403, headers: { 'Content-Type': 'application/json' } })
  }
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }


  return new Response(
    JSON.stringify({
      success: true,
      message: 'Automatic inspection fee payouts are disabled. Existing records have been preserved.',
      processed: 0,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  );
});
