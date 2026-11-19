-- Company payout account: service-role only, never exposed to clients.
create table if not exists public.company_payout_accounts (
  company_id uuid primary key references public.companies(id) on delete cascade,
  bank_code text not null,
  account_number text not null,
  account_name_resolved text not null,
  paystack_recipient_code text not null,
  verification_status text not null default 'pending_review'
    check (verification_status in ('pending_review','verified','rejected')),
  verified_by uuid references auth.users(id),
  verified_at timestamptz,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);
alter table public.company_payout_accounts enable row level security;
revoke all on public.company_payout_accounts from anon, authenticated;

-- Snapshot who gets paid at deal creation, so reassigning a listing or removing an
-- agent later cannot redirect money on a deal already in flight.
alter table public.deals add column if not exists payout_company_id uuid references public.companies(id);

create or replace function public.set_deal_payout_company()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  select p.company_id into new.payout_company_id
  from public.properties p where p.id = new.property_id;
  return new;
end; $$;
revoke execute on function public.set_deal_payout_company() from public, anon, authenticated;
drop trigger if exists trg_set_deal_payout_company on public.deals;
create trigger trg_set_deal_payout_company before insert on public.deals
  for each row execute function public.set_deal_payout_company();

-- Backfill existing company-listing deals (they will fail closed until a company
-- payout account is verified, which is what we want).
update public.deals d set payout_company_id = p.company_id
from public.properties p
where p.id = d.property_id and p.company_id is not null and d.payout_company_id is null;
