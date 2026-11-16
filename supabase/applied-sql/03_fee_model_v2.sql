-- RECORD ONLY. Already applied to the production database on 2026-11-13. Do not run.
-- Fee model v2 database layer. The feature switch is OFF by default, so existing and new
-- deals stay on the original fee model until it is enabled:
--   update public.feature_flags set enabled = true where key = 'fee_model_v2';
-- Enable it only after the frontend (itemised checkout) and the payment/payout functions
-- are deployed.

-- Feature switch.
create table if not exists public.feature_flags (
  key text primary key,
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into public.feature_flags (key, enabled) values ('fee_model_v2', false) on conflict (key) do nothing;
alter table public.feature_flags enable row level security;
drop policy if exists feature_flags_read on public.feature_flags;
create policy feature_flags_read on public.feature_flags for select to anon, authenticated using (true);
-- no write policies: only the service role / SQL editor can change a flag.

alter table public.deals
  add column if not exists fee_model_version smallint not null default 1,
  add column if not exists agency_fee numeric(15,2) not null default 0,
  add column if not exists total_payable numeric(15,2),
  add column if not exists payout_amount numeric(15,2),
  add column if not exists fee_snapshot jsonb;
alter table public.deals drop constraint if exists deals_fee_model_version_check;
alter table public.deals add constraint deals_fee_model_version_check check (fee_model_version in (1, 2));
alter table public.deals drop constraint if exists deals_agency_fee_check;
alter table public.deals add constraint deals_agency_fee_check check (agency_fee >= 0);

-- New deals: when the switch is on, every deal is created on the v2 model regardless of
-- which function creates it. Handova's 2% is added to the tenant's payment, never taken
-- from the landlord/agent; the legacy commission columns are zeroed.
create or replace function public.apply_fee_model_on_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.feature_flags where key = 'fee_model_v2' and enabled) then
    new.fee_model_version := 2;
    new.platform_fee := round(new.amount * 0.02);
    new.agent_fee := 0;
    new.agent_commission_rate := 0;
    new.landlord_payout := new.amount;
    if new.agent_id is null then new.agency_fee := 0; end if;
  end if;
  return new;
end; $$;
revoke execute on function public.apply_fee_model_on_insert() from public, anon, authenticated;
drop trigger if exists trg_apply_fee_model_on_insert on public.deals;
create trigger trg_apply_fee_model_on_insert before insert on public.deals
  for each row execute function public.apply_fee_model_on_insert();

-- v2 deals: one place computes what the tenant pays and what the recipient receives, and
-- the fee components are frozen once the tenant has approved the agreement.
create or replace function public.compute_deal_fees_v2()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.fee_model_version <> 2 then return new; end if;

  if tg_op = 'UPDATE'
     and old.status::text <> 'agreement_draft'
     and (new.amount is distinct from old.amount
          or new.platform_fee is distinct from old.platform_fee
          or new.agency_fee is distinct from old.agency_fee
          or new.agreement_fee is distinct from old.agreement_fee
          or new.inspection_fee_credit is distinct from old.inspection_fee_credit) then
    raise exception 'Fees cannot change after the agreement has been approved' using errcode = '42501';
  end if;

  new.total_payable := new.amount + coalesce(new.platform_fee, 0) + coalesce(new.agency_fee, 0)
                       + coalesce(new.agreement_fee, 0) - coalesce(new.inspection_fee_credit, 0);
  new.payout_amount := greatest(0, new.amount + coalesce(new.agency_fee, 0) - coalesce(new.inspection_fee_credit, 0));

  if tg_op = 'UPDATE' and new.status::text = 'payment_received' and old.status::text <> 'payment_received' then
    new.fee_snapshot := jsonb_build_object(
      'amount', new.amount,
      'handova_fee', new.platform_fee,
      'agency_fee', new.agency_fee,
      'agreement_fee', coalesce(new.agreement_fee, 0),
      'inspection_credit', coalesce(new.inspection_fee_credit, 0),
      'total_payable', new.total_payable,
      'payout_amount', new.payout_amount,
      'captured_at', now());
  end if;
  return new;
end; $$;
revoke execute on function public.compute_deal_fees_v2() from public, anon, authenticated;
drop trigger if exists trg_zy_compute_deal_fees_v2 on public.deals;
create trigger trg_zy_compute_deal_fees_v2 before insert or update on public.deals
  for each row execute function public.compute_deal_fees_v2();

-- Final version of the client guard: the deal's agent may also set agency_fee while the
-- deal is still a draft on fee model v2. (This replaces the version in 01_security_hardening.sql.)
create or replace function public.guard_deal_client_writes()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_jwt_role text := coalesce(auth.jwt() ->> 'role', '');
  v_key text;
begin
  if v_uid is null or v_jwt_role = 'service_role' then return new; end if;
  if public.is_moderator_or_admin() then return new; end if;

  for v_key in
    select n.key from jsonb_each(to_jsonb(new)) n
    full join jsonb_each(to_jsonb(old)) o using (key)
    where n.value is distinct from o.value
  loop
    if v_key not in ('agreement_url', 'agreement_path', 'notes', 'status', 'updated_at', 'agency_fee') then
      raise exception 'Not allowed to modify deal field: %', v_key using errcode = '42501';
    end if;
  end loop;

  if new.agency_fee is distinct from old.agency_fee then
    if old.fee_model_version <> 2 or old.status::text <> 'agreement_draft'
       or old.agent_id is null or v_uid not in (old.landlord_id, old.agent_id)
       or new.agency_fee < 0 then
      raise exception 'The agency fee can only be set by the deal agent while the agreement is still a draft' using errcode = '42501';
    end if;
  end if;

  if new.status is distinct from old.status then
    if old.status::text not in ('pending_payment', 'agreement_draft', 'agreement_sent')
       or new.status::text not in ('agreement_draft', 'agreement_sent') then
      raise exception 'Not allowed to change deal status from % to %', old.status, new.status using errcode = '42501';
    end if;
    if new.status::text = 'agreement_sent' and v_uid <> old.tenant_id then
      raise exception 'Only the tenant can approve the agreement draft' using errcode = '42501';
    end if;
  end if;
  return new;
end; $$;
