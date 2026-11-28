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
  -- Edge functions (service role) and internal DB contexts (no JWT) are trusted.
  if v_uid is null or v_jwt_role = 'service_role' then
    return new;
  end if;
  -- Admins keep full control (same as before).
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

  -- UPDATE
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
