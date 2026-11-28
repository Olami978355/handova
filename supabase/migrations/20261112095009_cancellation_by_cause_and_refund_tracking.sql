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
