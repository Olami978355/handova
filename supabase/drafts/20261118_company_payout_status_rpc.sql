create or replace function public.get_my_company_payout_status()
returns text
language sql stable security definer set search_path = public as $$
  select verification_status from public.company_payout_accounts where company_id = auth.uid()
$$;
revoke execute on function public.get_my_company_payout_status() from public, anon;
grant execute on function public.get_my_company_payout_status() to authenticated;
