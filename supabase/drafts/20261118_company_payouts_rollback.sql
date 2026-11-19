drop trigger if exists trg_set_deal_payout_company on public.deals;
drop function if exists public.set_deal_payout_company();
alter table public.deals drop column if exists payout_company_id;
drop table if exists public.company_payout_accounts;
