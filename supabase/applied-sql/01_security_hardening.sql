-- RECORD ONLY. Already applied to the production database on 2026-11-13. Do not run.
-- Security hardening: locks down exposed functions and adds guards so clients cannot edit
-- privileged columns (roles, verification, payouts, deal status, listing approval).

-- 1. Privileged functions were callable by anonymous users.
revoke execute on function public.execute_sql(text) from public, anon, authenticated;
grant execute on function public.execute_sql(text) to service_role;

revoke execute on function public.add_strike_and_check(uuid, text, text, uuid) from public, anon, authenticated;
grant execute on function public.add_strike_and_check(uuid, text, text, uuid) to service_role;

revoke execute on function public.block_user(uuid) from public, anon;
grant execute on function public.block_user(uuid) to authenticated, service_role;
revoke execute on function public.report_user(uuid, text) from public, anon;
grant execute on function public.report_user(uuid, text) to authenticated, service_role;
revoke execute on function public.report_user(uuid, text, text, uuid, uuid) from public, anon;
grant execute on function public.report_user(uuid, text, text, uuid, uuid) to authenticated, service_role;
revoke execute on function public.get_deal_delegate_preview(uuid) from public, anon;
grant execute on function public.get_deal_delegate_preview(uuid) to authenticated, service_role;

-- 2. Profiles: users could set their own role / verification / payout fields.
create or replace function public.guard_profile_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_jwt_role text := coalesce(auth.jwt() ->> 'role', '');
  v_staff boolean;
begin
  if v_uid is null or v_jwt_role = 'service_role' then
    return new;
  end if;
  if public.is_admin(v_uid) then
    return new;
  end if;
  v_staff := public.is_moderator_or_admin();

  if tg_op = 'INSERT' then
    if new.role::text in ('admin', 'moderator', 'banned') then
      raise exception 'Not allowed to assign this role' using errcode = '42501';
    end if;
    if coalesce(new.nin_verified, false) or new.first_payout_released_at is not null
       or new.paystack_recipient_code is not null or coalesce(new.is_system_account, false)
       or new.verification_status::text = 'verified' then
      raise exception 'Not allowed to set verification or payout fields' using errcode = '42501';
    end if;
    return new;
  end if;

  if new.id is distinct from old.id then
    raise exception 'Profile id cannot be changed' using errcode = '42501';
  end if;

  if new.role is distinct from old.role then
    if v_uid <> old.id
       or old.role::text in ('admin', 'moderator', 'banned')
       or new.role::text in ('admin', 'moderator', 'banned') then
      raise exception 'Not allowed to change role' using errcode = '42501';
    end if;
  end if;

  if new.verification_status is distinct from old.verification_status and not v_staff then
    if not (v_uid = old.id
            and new.verification_status::text = 'pending_verification'
            and old.verification_status::text <> 'verified') then
      raise exception 'Not allowed to change verification status' using errcode = '42501';
    end if;
  end if;

  if new.account_status is distinct from old.account_status and not v_staff then
    raise exception 'Not allowed to change account status' using errcode = '42501';
  end if;

  if new.nin_verified is distinct from old.nin_verified
     or new.first_payout_released_at is distinct from old.first_payout_released_at
     or new.paystack_recipient_code is distinct from old.paystack_recipient_code
     or new.is_system_account is distinct from old.is_system_account then
    raise exception 'Not allowed to change verification or payout fields' using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke execute on function public.guard_profile_privileged_columns() from public, anon, authenticated;

drop trigger if exists trg_guard_profile_privileged_columns on public.profiles;
create trigger trg_guard_profile_privileged_columns
  before insert or update on public.profiles
  for each row execute function public.guard_profile_privileged_columns();

-- 3. Deals: clients could insert deals and edit any column. (guard_deal_client_writes is
-- replaced by a later version in 03_fee_model_v2.sql, which also allows agency_fee.)
drop policy if exists deals_insert on public.deals;

create or replace function public.guard_deal_client_writes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_jwt_role text := coalesce(auth.jwt() ->> 'role', '');
  v_key text;
begin
  if v_uid is null or v_jwt_role = 'service_role' then
    return new;
  end if;
  if public.is_moderator_or_admin() then
    return new;
  end if;

  for v_key in
    select n.key
    from jsonb_each(to_jsonb(new)) n
    full join jsonb_each(to_jsonb(old)) o using (key)
    where n.value is distinct from o.value
  loop
    if v_key not in ('agreement_url', 'agreement_path', 'notes', 'status', 'updated_at') then
      raise exception 'Not allowed to modify deal field: %', v_key using errcode = '42501';
    end if;
  end loop;

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
end;
$$;

revoke execute on function public.guard_deal_client_writes() from public, anon, authenticated;

drop trigger if exists trg_guard_deal_client_writes on public.deals;
create trigger trg_guard_deal_client_writes
  before update on public.deals
  for each row execute function public.guard_deal_client_writes();

-- Audit trail: log rows can only be written by a participant, as themselves.
drop policy if exists deal_logs_insert on public.deal_logs;
create policy deal_logs_insert on public.deal_logs
  for insert to authenticated
  with check (
    performed_by = auth.uid()
    and exists (
      select 1 from public.deals d
      where d.id = deal_logs.deal_id
        and (d.tenant_id = auth.uid() or d.landlord_id = auth.uid() or d.agent_id = auth.uid()
             or public.is_accepted_delegate(d.id, auth.uid())
             or public.is_assigned_lawyer(d.id, auth.uid())
             or public.is_moderator_or_admin())
    )
  );

-- 4. Messages: only the sender can edit; anyone in the conversation can mark read / hide.
create or replace function public.guard_message_client_writes()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_jwt_role text := coalesce(auth.jwt() ->> 'role', '');
  v_key text;
begin
  if v_uid is null or v_jwt_role = 'service_role' then return new; end if;
  for v_key in
    select n.key from jsonb_each(to_jsonb(new)) n
    full join jsonb_each(to_jsonb(old)) o using (key)
    where n.value is distinct from o.value
  loop
    if v_key in ('read', 'deleted_for') then
      continue;
    elsif v_key in ('content', 'edited_at', 'deleted_for_everyone') then
      if old.sender_id is distinct from v_uid then
        raise exception 'Only the sender can edit or delete this message' using errcode = '42501';
      end if;
    else
      raise exception 'Not allowed to modify message field: %', v_key using errcode = '42501';
    end if;
  end loop;
  return new;
end; $$;
revoke execute on function public.guard_message_client_writes() from public, anon, authenticated;
drop trigger if exists trg_guard_message_client_writes on public.messages;
create trigger trg_guard_message_client_writes before update on public.messages
  for each row execute function public.guard_message_client_writes();

-- Properties: owners cannot self-approve, self-verify, or transfer ownership.
create or replace function public.guard_property_client_writes()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_jwt_role text := coalesce(auth.jwt() ->> 'role', '');
begin
  if v_uid is null or v_jwt_role = 'service_role' then return new; end if;
  if public.is_moderator_or_admin() then return new; end if;
  if tg_op = 'INSERT' then
    if new.status::text in ('active', 'rented', 'sold') then
      new.status := 'pending_review';
    end if;
    return new;
  end if;
  if new.owner_id is distinct from old.owner_id then
    raise exception 'Property ownership cannot be changed' using errcode = '42501';
  end if;
  if new.escrow_verified is distinct from old.escrow_verified then
    raise exception 'Not allowed to change escrow verification' using errcode = '42501';
  end if;
  if new.status is distinct from old.status and new.status::text in ('active', 'rented', 'sold') then
    raise exception 'Listings must be approved by Handova before going live' using errcode = '42501';
  end if;
  return new;
end; $$;
revoke execute on function public.guard_property_client_writes() from public, anon, authenticated;
drop trigger if exists trg_guard_property_client_writes on public.properties;
create trigger trg_guard_property_client_writes before insert or update on public.properties
  for each row execute function public.guard_property_client_writes();

-- Inspection bookings: clients may not touch money, refund, transfer or identity columns.
create or replace function public.guard_booking_client_writes()
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
    if v_key not in ('status', 'paystack_reference', 'updated_at', 'dispute_reason', 'dispute_evidence_urls',
                     'confirmed_date', 'confirmed_time', 'notes', 'preferred_date', 'preferred_time') then
      raise exception 'Not allowed to modify booking field: %', v_key using errcode = '42501';
    end if;
  end loop;
  return new;
end; $$;
revoke execute on function public.guard_booking_client_writes() from public, anon, authenticated;
drop trigger if exists trg_guard_booking_client_writes on public.inspection_bookings;
create trigger trg_guard_booking_client_writes before update on public.inspection_bookings
  for each row execute function public.guard_booking_client_writes();
