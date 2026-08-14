-- Lawyer tag on top of existing profiles (no new user_role enum value,
-- so this doesn't touch any existing role-check logic in the app)
alter table public.profiles
  add column if not exists is_lawyer boolean not null default false;

-- Separate from verification_requests (which is LASRERA/NIN identity verification).
-- This is legal-credential verification specifically.
create table if not exists public.lawyer_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  nba_number text not null,
  cert_url text,
  specialty text not null default 'tenancy'
    check (specialty in ('tenancy', 'property_title', 'both')),
  states_covered text[] not null default '{}',
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  rejection_reason text,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists lawyer_verifications_user_id_idx
  on public.lawyer_verifications(user_id);
create index if not exists lawyer_verifications_status_idx
  on public.lawyer_verifications(status);

alter table public.lawyer_verifications enable row level security;

-- applicant can see and submit their own application (no self-update:
-- once submitted it's locked until an admin reviews it)
create policy "lawyer_verifications_select_own"
  on public.lawyer_verifications for select
  using (auth.uid() = user_id);

create policy "lawyer_verifications_insert_own"
  on public.lawyer_verifications for insert
  with check (auth.uid() = user_id);

-- admin/moderator can see and review all applications
create policy "lawyer_verifications_admin_select"
  on public.lawyer_verifications for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'moderator')
    )
  );

create policy "lawyer_verifications_admin_update"
  on public.lawyer_verifications for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'moderator')
    )
  );

-- explicit grants, per the deal_delegates lesson: RLS policies alone are not
-- sufficient, the authenticated role needs actual table-level grants too
grant select, insert, update on public.lawyer_verifications to authenticated;
