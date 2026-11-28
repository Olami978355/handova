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
