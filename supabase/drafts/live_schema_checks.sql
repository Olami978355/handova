-- READ-ONLY checks. Run in the Supabase SQL editor (one at a time) and send me the results.

-- 1. How the public profile view treats phone numbers (not defined in the repo)
select pg_get_viewdef('public.public_profiles'::regclass, true) as public_profiles_definition;

-- 2. Is profiles.role the user_role enum, and which values exist?
select t.typname, e.enumlabel
from pg_type t join pg_enum e on e.enumtypid = t.oid
where t.typname = 'user_role' order by e.enumsortorder;

-- 3. Do the helper function and the new tables already exist?
select to_regclass('public.deal_reviews')  as deal_reviews,
       to_regclass('public.companies')     as companies,
       to_regprocedure('public.is_admin()') as is_admin;

-- 4. Live columns of profiles and properties
select table_name, column_name, udt_name
from information_schema.columns
where table_schema = 'public' and table_name in ('profiles', 'properties')
order by table_name, ordinal_position;

-- 5. Live RLS policies and triggers on those two tables
select 'policy' as kind, tablename as tbl, policyname as name, cmd, qual as definition
from pg_policies where schemaname = 'public' and tablename in ('profiles', 'properties')
union all
select 'trigger', tgrelid::regclass::text, tgname, '', pg_get_triggerdef(oid)
from pg_trigger
where not tgisinternal and tgrelid in ('public.profiles'::regclass, 'public.properties'::regclass)
order by 1, 2, 3;
