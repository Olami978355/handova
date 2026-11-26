-- Clients can no longer set payment_confirmed or wallet_credit_version on bookings;
-- paid bookings go through verify-inspection-payment (service role).
create or replace function public.guard_inspection_booking_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;

  if new.inspection_fee    is distinct from old.inspection_fee
  or new.transfer_status   is distinct from old.transfer_status
  or new.release_at        is distinct from old.release_at
  or new.confirmed_date    is distinct from old.confirmed_date
  or new.confirmed_time    is distinct from old.confirmed_time
  or new.landlord_id       is distinct from old.landlord_id
  or new.agent_id          is distinct from old.agent_id
  or new.tenant_id         is distinct from old.tenant_id
  or new.property_id       is distinct from old.property_id
  or new.wallet_credit_version is distinct from old.wallet_credit_version then
    raise exception 'These booking fields can only be changed by the system';
  end if;

  if new.paystack_reference is distinct from old.paystack_reference
     and old.status::text <> 'pending_payment' then
    raise exception 'Payment reference cannot be changed';
  end if;

  if new.status is distinct from old.status then
    if new.status::text = 'dispute_raised' then
      null;
    else
      raise exception 'This status change must go through the system';
    end if;
  end if;

  return new;
end;
$$;
