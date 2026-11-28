-- MESSAGES: anyone in the conversation may mark read / hide for themselves; only the sender may edit or delete-for-everyone.
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

-- PROPERTIES: owners cannot self-approve, self-verify, or transfer ownership.
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

-- INSPECTION BOOKINGS: clients may not touch money, refund, transfer or identity columns.
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
