-- Handova keeps 15% of each inspection fee; the agent/company wallet is credited 85%.
alter table public.wallet_transactions
  add column if not exists gross_amount_kobo bigint,
  add column if not exists platform_fee_kobo bigint;

create or replace function public.credit_inspection_fee_wallet(p_booking_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_booking record; v_owner_type text; v_owner_id uuid; v_wallet_id uuid;
  v_gross_kobo bigint; v_platform_fee_kobo bigint; v_net_kobo bigint;
  v_reference text; v_transaction_id uuid;
begin
  select ib.id, ib.inspection_fee, ib.paystack_reference, ib.wallet_credit_version,
         ib.agent_id, ib.landlord_id, p.company_id
    into v_booking
  from public.inspection_bookings ib
  join public.properties p on p.id = ib.property_id
  where ib.id = p_booking_id;

  if not found then raise exception 'Inspection booking not found'; end if;
  if v_booking.wallet_credit_version is distinct from 'instant_wallet_v1' then
    raise exception 'Booking is not eligible for instant wallet credit'; end if;
  if v_booking.paystack_reference is null or v_booking.paystack_reference = '' then
    raise exception 'Booking has no successful payment reference'; end if;

  v_gross_kobo := round(v_booking.inspection_fee * 100)::bigint;
  if v_gross_kobo <= 0 then raise exception 'Inspection fee must be greater than zero'; end if;

  v_platform_fee_kobo := (v_gross_kobo * 15) / 100;
  v_net_kobo := v_gross_kobo - v_platform_fee_kobo;

  if v_booking.company_id is not null then
    v_owner_type := 'company'; v_owner_id := v_booking.company_id;
  elsif v_booking.agent_id is not null then
    v_owner_type := 'agent'; v_owner_id := v_booking.agent_id;
  else
    v_owner_type := 'landlord'; v_owner_id := v_booking.landlord_id;
  end if;
  if v_owner_id is null then raise exception 'No eligible wallet recipient found'; end if;

  v_reference := 'INSPECTION_FEE_' || p_booking_id::text;

  insert into public.wallet_accounts (owner_type, owner_id) values (v_owner_type, v_owner_id)
  on conflict (owner_type, owner_id) do nothing;

  select id into v_wallet_id from public.wallet_accounts
  where owner_type = v_owner_type and owner_id = v_owner_id for update;

  insert into public.wallet_transactions
    (wallet_id, transaction_type, amount_kobo, gross_amount_kobo, platform_fee_kobo, reference, booking_id, description)
  values
    (v_wallet_id, 'inspection_fee_credit', v_net_kobo, v_gross_kobo, v_platform_fee_kobo, v_reference, p_booking_id,
     'Inspection fee received (after 15% Handova fee)')
  on conflict do nothing
  returning id into v_transaction_id;

  if v_transaction_id is null then
    return jsonb_build_object('success', true, 'already_credited', true, 'booking_id', p_booking_id);
  end if;

  update public.wallet_accounts
  set available_balance_kobo = available_balance_kobo + v_net_kobo, updated_at = now()
  where id = v_wallet_id;

  return jsonb_build_object('success', true, 'already_credited', false, 'wallet_id', v_wallet_id,
    'transaction_id', v_transaction_id, 'amount_kobo', v_net_kobo,
    'platform_fee_kobo', v_platform_fee_kobo, 'owner_type', v_owner_type, 'owner_id', v_owner_id);
end;
$$;
