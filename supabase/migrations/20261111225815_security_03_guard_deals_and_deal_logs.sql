-- Deals are created only by edge functions (service role). Clients must not insert deals.
drop policy if exists deals_insert on public.deals;

-- Clients may only touch agreement draft fields and move status between agreement_draft/agreement_sent.
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
