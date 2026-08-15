create or replace function public.add_strike_and_check(
  p_user_id uuid,
  p_reason text,
  p_related_type text default null,
  p_related_id uuid default null
)
returns jsonb
language plpgsql
security definer
as $function$
declare
    strike_count int;
    result jsonb;
begin
    insert into strikes (user_id, reason, related_type, related_id, issued_by)
    values (p_user_id, p_reason, p_related_type, p_related_id, auth.uid());

    select count(*) into strike_count
    from strikes
    where user_id = p_user_id;

    if strike_count >= 3 then
        -- Reuse the same suspension mechanism as manual admin suspend,
        -- rather than the old role='banned' which nothing ever checked.
        update profiles set account_status = 'suspended' where id = p_user_id;

        insert into admin_logs (actor_id, action, target_id, target_type, details)
        values (
          auth.uid(),
          'auto_suspended_third_strike',
          p_user_id,
          'profile',
          jsonb_build_object('strike_count', strike_count, 'reason', p_reason)
        );

        result := jsonb_build_object('suspended', true, 'strike_count', strike_count);
    else
        result := jsonb_build_object('suspended', false, 'strike_count', strike_count);
    end if;

    return result;
end;
$function$;
