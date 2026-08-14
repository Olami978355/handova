-- New-account payout delay: a landlord/agent's first-ever released payout
-- is held for explicit admin confirmation instead of transferring
-- automatically, adding a manual checkpoint before trusting a new
-- recipient's bank details. Does not touch deals.status or is_rented —
-- nothing user-facing changes until an admin confirms the hold.

alter table public.profiles
  add column if not exists first_payout_released_at timestamptz;

alter table public.deals
  drop constraint deals_transfer_status_check;

alter table public.deals
  add constraint deals_transfer_status_check
  check (transfer_status = any (array['pending'::text, 'success'::text, 'failed'::text, 'first_payout_review'::text]));
