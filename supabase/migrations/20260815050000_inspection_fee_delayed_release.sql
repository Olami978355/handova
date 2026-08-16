-- Inspection fee is now held by Handova until the agreed inspection date
-- passes, rather than paid out to the agent/landlord the instant payment
-- clears. This guarantees Handova never loses money on a founded dispute,
-- since the payout simply hasn't happened yet if something goes wrong
-- before the release date arrives.

alter table public.inspection_bookings
  add column if not exists release_at timestamptz;

alter table public.inspection_bookings
  drop constraint inspection_bookings_transfer_status_check;

alter table public.inspection_bookings
  add constraint inspection_bookings_transfer_status_check
  check (transfer_status = any (array['pending'::text, 'success'::text, 'failed'::text, 'awaiting_release'::text]));
