-- RECORD ONLY. Already applied to the production database on 2026-11-13. Do not run.
-- Release/refund state on deals, atomic release claim, signatures bound to the exact
-- document, and atomic cancellation with refund tracking.

-- 1. Separate release / refund state from the rental milestone in deals.status.
alter table public.deals
  add column if not exists release_status text not null default 'not_started',
  add column if not exists release_submitted_at timestamptz,
  add column if not exists release_attempts integer not null default 0,
  add column if not exists release_failure_reason text,
  add column if not exists refund_status text not null default 'none',
  add column if not exists cancellation_cause text;

alter table public.deals drop constraint if exists deals_release_status_check;
alter table public.deals add constraint deals_release_status_check
  check (release_status in ('not_started','held_for_review','submitted','processing','completed','failed'));
alter table public.deals drop constraint if exists deals_refund_status_check;
alter table public.deals add constraint deals_refund_status_check
  check (refund_status in ('none','pending','completed','failed'));
alter table public.deals drop constraint if exists deals_cancellation_cause_check;
alter table public.deals add constraint deals_cancellation_cause_check
  check (cancellation_cause is null or cancellation_cause in
    ('tenant_voluntary','landlord','agent','handova','invalid_listing','handover_failure','mutual','other'));

-- Backfill from what the existing transfer_status already says.
update public.deals set release_status = case transfer_status::text
    when 'success' then 'completed'
    when 'failed' then 'failed'
    when 'pending' then 'processing'
    when 'first_payout_review' then 'held_for_review'
    else release_status end
where status::text = 'funds_released';

-- 2. Atomic claim so only one caller can submit a release for a deal at a time.
create or replace function public.claim_deal_release(p_deal_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_attempt integer;
begin
  update public.deals
     set release_status = 'submitted', release_submitted_at = now(),
         release_attempts = release_attempts + 1, release_failure_reason = null, updated_at = now()
   where id = p_deal_id
     and ((status::text = 'move_in_confirmed' and release_status in ('not_started','failed','held_for_review'))
       or (status::text = 'funds_released' and release_status = 'failed'))
  returning release_attempts into v_attempt;
  if v_attempt is null then return jsonb_build_object('claimed', false); end if;
  return jsonb_build_object('claimed', true, 'attempt', v_attempt);
end; $$;
revoke execute on function public.claim_deal_release(uuid) from public, anon, authenticated;
grant execute on function public.claim_deal_release(uuid) to service_role;

-- 3. Signatures bound to the exact document that was signed.
create table if not exists public.agreement_signatures (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete restrict,
  side text not null check (side in ('tenant','landlord')),
  signer_id uuid not null,
  on_behalf_of uuid,
  document_sha256 text not null,
  document_path text,
  signed_at timestamptz not null default now(),
  superseded_at timestamptz
);
create unique index if not exists agreement_signatures_one_active_per_side
  on public.agreement_signatures (deal_id, side) where superseded_at is null;
create index if not exists agreement_signatures_deal_idx on public.agreement_signatures (deal_id);
alter table public.agreement_signatures enable row level security;
drop policy if exists agreement_signatures_select on public.agreement_signatures;
create policy agreement_signatures_select on public.agreement_signatures
  for select to authenticated
  using (exists (select 1 from public.deals d where d.id = agreement_signatures.deal_id
    and (d.tenant_id = auth.uid() or d.landlord_id = auth.uid() or d.agent_id = auth.uid()
         or public.is_moderator_or_admin())));
-- no insert/update/delete policies: only the service role writes signatures.

create or replace function public.sign_deal_agreement(
  p_deal_id uuid, p_signer_id uuid, p_side text, p_on_behalf_of uuid,
  p_document_sha256 text, p_document_path text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  d public.deals%rowtype;
  v_other text;
  v_other_hash text;
  v_both boolean := false;
  v_reset_other boolean := false;
begin
  if p_side not in ('tenant','landlord') then raise exception 'Invalid signing side'; end if;
  select * into d from public.deals where id = p_deal_id for update;
  if not found then raise exception 'Deal not found'; end if;
  if d.status::text <> 'agreement_sent' then
    raise exception 'Cannot sign agreement in % status', d.status;
  end if;
  if d.agreement_url is null then raise exception 'Agreement has not been uploaded yet'; end if;
  if exists (select 1 from public.agreement_signatures
             where deal_id = p_deal_id and side = p_side and superseded_at is null) then
    raise exception '% side has already signed', initcap(p_side);
  end if;

  v_other := case when p_side = 'tenant' then 'landlord' else 'tenant' end;
  select document_sha256 into v_other_hash from public.agreement_signatures
   where deal_id = p_deal_id and side = v_other and superseded_at is null;

  if v_other_hash is not null and v_other_hash <> p_document_sha256 then
    -- The other side signed a different version of the file: that signature no longer counts.
    update public.agreement_signatures set superseded_at = now()
     where deal_id = p_deal_id and side = v_other and superseded_at is null;
    v_other_hash := null;
    v_reset_other := true;
  end if;

  insert into public.agreement_signatures (deal_id, side, signer_id, on_behalf_of, document_sha256, document_path)
  values (p_deal_id, p_side, p_signer_id, p_on_behalf_of, p_document_sha256, p_document_path);

  v_both := v_other_hash is not null;

  if p_side = 'tenant' then
    update public.deals set tenant_signed_at = now(), tenant_signed_by = p_signer_id,
           landlord_signed_at = case when v_reset_other then null else landlord_signed_at end,
           landlord_signed_by = case when v_reset_other then null else landlord_signed_by end,
           updated_at = now() where id = p_deal_id;
  else
    update public.deals set landlord_signed_at = now(), landlord_signed_by = p_signer_id,
           tenant_signed_at = case when v_reset_other then null else tenant_signed_at end,
           tenant_signed_by = case when v_reset_other then null else tenant_signed_by end,
           updated_at = now() where id = p_deal_id;
  end if;
  if v_both then
    update public.deals set status = 'pending_payment', updated_at = now() where id = p_deal_id;
  end if;
  return jsonb_build_object('both_signed', v_both, 'other_side_reset', v_reset_other);
end; $$;
revoke execute on function public.sign_deal_agreement(uuid, uuid, text, uuid, text, text) from public, anon, authenticated;
grant execute on function public.sign_deal_agreement(uuid, uuid, text, uuid, text, text) to service_role;

-- 4. Signatures never survive a change to the document before payment.
create or replace function public.invalidate_signatures_on_document_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (old.tenant_signed_at is not null or old.landlord_signed_at is not null)
     and old.status::text in ('agreement_sent','pending_payment','agreement_signed','agreement_draft')
     and ((new.status::text = 'agreement_draft' and old.status::text <> 'agreement_draft')
          or new.agreement_path is distinct from old.agreement_path) then
    new.tenant_signed_at := null; new.tenant_signed_by := null;
    new.landlord_signed_at := null; new.landlord_signed_by := null;
    update public.agreement_signatures set superseded_at = now()
     where deal_id = new.id and superseded_at is null;
    if new.status::text in ('pending_payment','agreement_signed','agreement_sent') then
      new.status := 'agreement_draft';
    end if;
  end if;
  return new;
end; $$;
revoke execute on function public.invalidate_signatures_on_document_change() from public, anon, authenticated;
drop trigger if exists trg_zz_invalidate_signatures on public.deals;
create trigger trg_zz_invalidate_signatures before update on public.deals
  for each row execute function public.invalidate_signatures_on_document_change();

-- 5. Cancellation and refund tracking.
alter table public.deals
  add column if not exists refund_failure_reason text,
  add column if not exists refund_requested_at timestamptz;

-- Atomically cancel a deal. Only one caller can win, and it can never cancel a deal
-- that has reached move-in, release, dispute, or is already cancelled/refunded.
create or replace function public.begin_deal_cancellation(
  p_deal_id uuid, p_actor uuid, p_cause text, p_reason text, p_fee numeric, p_refund numeric)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if p_cause not in ('tenant_voluntary','landlord','agent','handova','invalid_listing','handover_failure','mutual','other') then
    raise exception 'Unknown cancellation cause';
  end if;
  update public.deals set
      status = 'cancelled',
      cancelled_at = now(),
      cancelled_by = p_actor,
      cancellation_reason = p_reason,
      cancellation_cause = p_cause,
      cancellation_fee = p_fee,
      refund_amount = p_refund,
      refund_status = case when p_refund > 0 then 'pending' else 'none' end,
      refund_requested_at = case when p_refund > 0 then now() else null end,
      refund_failure_reason = null,
      updated_at = now()
    where id = p_deal_id
      and status::text not in ('move_in_confirmed','funds_released','disputed','cancelled','refunded')
    returning id into v_id;
  return jsonb_build_object('cancelled', v_id is not null);
end; $$;
revoke execute on function public.begin_deal_cancellation(uuid, uuid, text, text, numeric, numeric) from public, anon, authenticated;
grant execute on function public.begin_deal_cancellation(uuid, uuid, text, text, numeric, numeric) to service_role;

-- Atomically claim a retry of a failed refund (amount is the one recorded at cancellation).
create or replace function public.claim_deal_refund_retry(p_deal_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_amount numeric;
begin
  update public.deals set refund_status = 'pending', refund_failure_reason = null,
         refund_requested_at = now(), updated_at = now()
   where id = p_deal_id and status::text = 'cancelled' and refund_status = 'failed'
   returning refund_amount into v_amount;
  if v_amount is null then return jsonb_build_object('claimed', false); end if;
  return jsonb_build_object('claimed', true, 'refund_amount', v_amount);
end; $$;
revoke execute on function public.claim_deal_refund_retry(uuid) from public, anon, authenticated;
grant execute on function public.claim_deal_refund_retry(uuid) to service_role;
