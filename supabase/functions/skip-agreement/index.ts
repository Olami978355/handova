import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/utils.ts';

// Skipping the tenancy agreement is no longer permitted. A written agreement
// is required for every deal regardless of amount. This function is kept in
// place (rather than removed) so any stale client still calling it receives
// a clear rejection instead of a broken/missing endpoint.
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  return new Response(
    JSON.stringify({ error: 'A written tenancy agreement is required for every deal and can no longer be skipped.' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
  );
});
