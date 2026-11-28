-- execute_sql(text) runs arbitrary SQL as its owner and was executable by anon/authenticated.
-- Only the auto-expire-decisions edge function (service role) uses it.
revoke execute on function public.execute_sql(text) from public, anon, authenticated;
grant execute on function public.execute_sql(text) to service_role;

-- add_strike_and_check() had no authorization check: any user could strike/suspend any account.
-- Only resolve-inspection-dispute (service role) calls it.
revoke execute on function public.add_strike_and_check(uuid, text, text, uuid) from public, anon, authenticated;
grant execute on function public.add_strike_and_check(uuid, text, text, uuid) to service_role;

-- User-action RPCs rely on auth.uid(); anonymous callers have no legitimate use.
revoke execute on function public.block_user(uuid) from public, anon;
grant execute on function public.block_user(uuid) to authenticated, service_role;
revoke execute on function public.report_user(uuid, text) from public, anon;
grant execute on function public.report_user(uuid, text) to authenticated, service_role;
revoke execute on function public.report_user(uuid, text, text, uuid, uuid) from public, anon;
grant execute on function public.report_user(uuid, text, text, uuid, uuid) to authenticated, service_role;
revoke execute on function public.get_deal_delegate_preview(uuid) from public, anon;
grant execute on function public.get_deal_delegate_preview(uuid) to authenticated, service_role;
