-- Applied to production: phone is visible only to signed-in users, and only if phone_public.
create or replace view public.public_profiles as
 select id, full_name, username, avatar_url, role, verification_status,
    nin_verified, lasrera_id, created_at,
    case when phone_public and auth.uid() is not null then phone else null::text end as phone,
    is_system_account
   from profiles
  where account_status is distinct from 'suspended'::text;
-- Rollback: same view with: case when phone_public then phone else null::text end as phone
