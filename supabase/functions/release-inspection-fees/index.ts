import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/utils.ts';
import { getServiceRoleKey } from "../_shared/supabase.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const allowedKeys = [Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", getServiceRoleKey()].filter(Boolean);
  if (bearerToken.length === 0 || allowedKeys.includes(bearerToken) === false) {
    return new Response(JSON.stringify({ error: "Not allowed" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
