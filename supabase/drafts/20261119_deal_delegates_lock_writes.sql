-- Applied to production: the app login can no longer write to deal_delegates directly.
-- All writes go through the invite-deal-delegate, respond-to-delegate-invite and
-- revoke-deal-delegate edge functions, which use the service role. Reads are unchanged.
revoke insert, update, delete on public.deal_delegates from authenticated, anon;
