-- Applied to production: skip duplicate leave-request notifications within 24h.
CREATE OR REPLACE FUNCTION public.request_company_leave(p_company uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_name text;
  v_body text;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  if not exists (
    select 1 from public.company_members
    where company_id = p_company and member_id = auth.uid()
      and status = 'active') then
    raise exception 'You are not an active member of this company';
  end if;
  select full_name into v_name from public.profiles where id = auth.uid();
  v_body := coalesce(v_name, 'An agent') || ' asked to leave your team.';
  if exists (
    select 1 from public.notifications
    where user_id = p_company
      and title = 'Leave request'
      and body = v_body
      and created_at > now() - interval '24 hours') then
    return;
  end if;
  insert into public.notifications (user_id, title, body, type, link)
  values (p_company, 'Leave request', v_body, 'info', '/company/dashboard');
end $function$;
