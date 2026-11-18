-- ROLLBACK for 20261114_company_foundation.sql (draft v2).
-- Run only if the draft was applied. The 'company' value added to
-- user_role cannot be removed in Postgres; it is harmless unused.

drop trigger if exists trg_guard_property_company
  on public.properties;
alter table public.properties drop column if exists company_id;

drop table if exists public.property_agents;
drop table if exists public.company_members;
drop table if exists public.companies;

drop function if exists public.guard_property_company();
drop function if exists public.guard_company_member_update();
drop function if exists public.guard_company_update();
drop function if exists public.property_company(uuid);
drop function if exists public.is_company_profile(uuid);
drop function if exists public.is_agent_profile(uuid);
