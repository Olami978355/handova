-- A tenant, landlord, or agent pays to have a lawyer review the deal's
-- agreement before signing. Two fees tracked separately per the actual
-- pricing model: a flat, non-refundable Handova platform fee, and the
-- lawyer's own fee (lawyer-set, minimum enforced, refunded only if the
-- lawyer never responds within the deadline).

create table if not exists public.lawyer_review_bookings (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  requested_by uuid not null references public.profiles(id),
  lawyer_id uuid not null references public.profiles(id),
  platform_fee numeric not null default 500,
  lawyer_fee numeric not null check (lawyer_fee >= 1000),
  paystack_reference text unique,
  status text not null default 'pending_payment'
    check (status in ('pending_payment', 'paid', 'verdict_submitted', 'refunded', 'expired')),
  verdict text check (verdict in ('fine', 'concerns', null)),
  verdict_notes text,
  verdict_submitted_at timestamptz,
  response_deadline timestamptz,
  paystack_refund_reference text,
  paystack_transfer_code text,
  paystack_transfer_reference text,
  transfer_status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lawyer_review_bookings_deal_id_idx on public.lawyer_review_bookings(deal_id);
create index if not exists lawyer_review_bookings_lawyer_id_idx on public.lawyer_review_bookings(lawyer_id);
create index if not exists lawyer_review_bookings_requested_by_idx on public.lawyer_review_bookings(requested_by);
create index if not exists lawyer_review_bookings_status_deadline_idx
  on public.lawyer_review_bookings(status, response_deadline)
  where status = 'paid';

alter table public.lawyer_review_bookings enable row level security;

-- requester sees their own bookings
create policy "lawyer_review_bookings_select_requester"
  on public.lawyer_review_bookings for select
  using (auth.uid() = requested_by);

-- the assigned lawyer sees bookings assigned to them
create policy "lawyer_review_bookings_select_lawyer"
  on public.lawyer_review_bookings for select
  using (auth.uid() = lawyer_id);

-- requester can create a booking for themselves
create policy "lawyer_review_bookings_insert_requester"
  on public.lawyer_review_bookings for insert
  with check (auth.uid() = requested_by);

-- requester can update their own booking (used for the initial
-- payment_confirmed flip, mirroring inspection_bookings' pattern)
create policy "lawyer_review_bookings_update_requester"
  on public.lawyer_review_bookings for update
  using (auth.uid() = requested_by);

-- the assigned lawyer can update their own booking (used to submit
-- a verdict)
create policy "lawyer_review_bookings_update_lawyer"
  on public.lawyer_review_bookings for update
  using (auth.uid() = lawyer_id);

-- admin/moderator can see and manage all bookings
create policy "lawyer_review_bookings_admin_all"
  on public.lawyer_review_bookings for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'moderator')
    )
  );

grant select, insert, update on public.lawyer_review_bookings to authenticated;
