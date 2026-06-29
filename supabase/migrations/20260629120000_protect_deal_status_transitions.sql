-- Prevents non-service-role clients (tenants, landlords, agents) from directly
-- setting deal.status to 'payment_received' or 'agreement_signed', and from
-- writing tenant_signed_at / landlord_signed_at directly.
--
-- These transitions must only happen via trusted server-side Edge Functions
-- (process-payment-webhook, sign-agreement) using the service role key.
--
-- Background: a client-side bug in DealDetail.tsx was setting
-- status = 'payment_received' directly from the browser on Paystack's
-- client-side onSuccess callback, with no server-side payment verification.
-- This trigger closes that hole at the database level as defense-in-depth,
-- independent of fixing the frontend/webhook (tracked separately).

create or replace function public.protect_deal_status_transitions()
returns trigger as $$
begin
  -- service_role (Edge Functions using adminSupabase) bypasses this check entirely
  if auth.role() = 'service_role' then
    return new;
  end if;

  -- block a non-service-role caller from CHANGING status into a protected value.
  -- "is distinct from" ensures this only fires on an actual transition,
  -- not on unrelated column updates to a row that already holds that status.
  if new.status in ('payment_received', 'agreement_signed')
     and new.status is distinct from old.status then
    raise exception 'status "%" can only be set by a verified server-side process', new.status;
  end if;

  -- block client-side writes to signature timestamps
  if new.tenant_signed_at is distinct from old.tenant_signed_at then
    raise exception 'tenant_signed_at can only be set by sign-agreement';
  end if;
  if new.landlord_signed_at is distinct from old.landlord_signed_at then
    raise exception 'landlord_signed_at can only be set by sign-agreement';
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_protect_deal_status_transitions on public.deals;
create trigger trg_protect_deal_status_transitions
  before update on public.deals
  for each row
  execute function public.protect_deal_status_transitions();
