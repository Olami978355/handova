-- =================================================================
-- DRAFT v2, NOT APPLIED. Handova Phase 1: company foundation.
--
-- Additive only. Does NOT touch deals, deal_logs, release, refund
-- or fee columns, feature_flags, or any existing policy/trigger.
--
-- Money rule enforced here: a company listing is owned by the
-- company account and has NO lead agent on the property row, so
-- deals on it pay the company (release-funds pays deal.agent_id,
-- else the landlord). Staff are assigned through property_agents.
--
-- Phase 1 has no manager role: the company account is the only
-- actor. Existing properties and deal policies are owner-only.
-- =================================================================

-- 1. Role value ---------------------------------------------------
alter type public.user_role add value if not exists 'company';

-- 2. Tables -------------------------------------------------------
create table if not exists public.companies (
  id uuid primary key
    references public.profiles(id) on delete cascade,
  name text not null
    check (length(trim(name)) between 2 and 120),
  slug text unique,
  description text,
  logo_url text,
  cac_number text,
  verification_status text not null default 'unverified'
    check (verification_status in
      ('unverified','pending_verification','verified','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.company_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null
    references public.companies(id) on delete cascade,
  member_id uuid not null
    references public.profiles(id) on delete cascade,
  status text not null default 'invited'
    check (status in ('invited','active','removed')),
  invited_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (company_id, member_id),
  check (company_id <> member_id)
);

-- Phase 1: an agent works with at most one company at a time.
create unique index if not exists uq_company_members_one_active
  on public.company_members (member_id)
  where status = 'active';

alter table public.properties
  add column if not exists company_id uuid
  references public.companies(id) on delete set null;
create index if not exists idx_properties_company
  on public.properties (company_id);

create table if not exists public.property_agents (
  property_id uuid not null
    references public.properties(id) on delete cascade,
  agent_id uuid not null
    references public.profiles(id) on delete cascade,
  assigned_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  primary key (property_id, agent_id)
);
create index if not exists idx_property_agents_agent
  on public.property_agents (agent_id);

-- 3. Helper functions (read-only, security definer) ---------------
create or replace function public.is_agent_profile(p_id uuid)
returns boolean language sql stable
security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = p_id and role::text = 'agent');
$$;

create or replace function public.is_company_profile(p_id uuid)
returns boolean language sql stable
security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = p_id and role::text = 'company');
$$;

create or replace function public.property_company(p_property uuid)
returns uuid language sql stable
security definer set search_path = public as $$
  select company_id from public.properties
  where id = p_property;
$$;

revoke all on function public.is_agent_profile(uuid),
  public.is_company_profile(uuid),
  public.property_company(uuid) from public;
grant execute on function public.is_agent_profile(uuid),
  public.is_company_profile(uuid),
  public.property_company(uuid) to anon, authenticated;

-- 4. Guard triggers -----------------------------------------------
-- Service role / SQL editor (auth.uid() is null) and admins are
-- not restricted.

create or replace function public.guard_company_update()
returns trigger language plpgsql as $$
begin
  if auth.uid() is null or coalesce(public.is_admin(), false) then
    new.updated_at := now();
    return new;
  end if;
  if new.id is distinct from old.id then
    raise exception 'Company id cannot be changed'
      using errcode = '42501';
  end if;
  -- Verification is admin-controlled. The owner may only
  -- ask for a (re)check.
  if new.verification_status is distinct from old.verification_status
     and not (new.verification_status = 'pending_verification'
              and old.verification_status in
                ('unverified','rejected')) then
    raise exception 'Only an admin can change verification status'
      using errcode = '42501';
  end if;
  -- A verified business that changes its name or registration
  -- number is rechecked.
  if old.verification_status = 'verified'
     and (new.name is distinct from old.name
          or new.cac_number is distinct from old.cac_number) then
    new.verification_status := 'pending_verification';
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_guard_company_update
  on public.companies;
create trigger trg_guard_company_update
  before update on public.companies
  for each row execute function public.guard_company_update();

create or replace function public.guard_company_member_update()
returns trigger language plpgsql as $$
declare
  v_is_owner boolean := (old.company_id = auth.uid());
  v_is_self  boolean := (old.member_id = auth.uid());
begin
  if auth.uid() is null or coalesce(public.is_admin(), false) then
    return new;
  end if;
  if new.company_id is distinct from old.company_id
     or new.member_id is distinct from old.member_id
     or new.invited_by is distinct from old.invited_by then
    raise exception 'Membership identity fields cannot be changed'
      using errcode = '42501';
  end if;
  if new.status is distinct from old.status then
    if v_is_self and old.status = 'invited'
       and new.status in ('active','removed') then
      null;  -- agent accepts or declines
    elsif v_is_self and old.status = 'active'
          and new.status = 'removed' then
      null;  -- agent leaves
    elsif v_is_owner and new.status = 'removed'
          and old.status in ('invited','active') then
      null;  -- company cancels an invite or removes an agent
    elsif v_is_owner and old.status = 'removed'
          and new.status = 'invited' then
      null;  -- company re-invites
    else
      raise exception 'Invalid membership status change'
        using errcode = '42501';
    end if;
    if new.status in ('active','removed') then
      new.responded_at := now();
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_guard_company_member_update
  on public.company_members;
create trigger trg_guard_company_member_update
  before update on public.company_members
  for each row
  execute function public.guard_company_member_update();

-- Company listings: owned by the company account, no lead agent.
create or replace function public.guard_property_company()
returns trigger language plpgsql as $$
begin
  if new.company_id is null then
    return new;
  end if;
  if auth.uid() is null or coalesce(public.is_admin(), false) then
    return new;
  end if;
  if auth.uid() is distinct from new.company_id then
    raise exception 'Only the company account can publish for it'
      using errcode = '42501';
  end if;
  if new.owner_id is distinct from new.company_id then
    raise exception 'Company listings must be owned by the company'
      using errcode = '42501';
  end if;
  if new.agent_id is not null then
    raise exception
      'Company listings have no lead agent; assign agents instead'
      using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists trg_guard_property_company
  on public.properties;
create trigger trg_guard_property_company
  before insert or update of company_id, owner_id, agent_id
  on public.properties
  for each row execute function public.guard_property_company();

-- 5. Row level security -------------------------------------------
alter table public.companies enable row level security;
alter table public.company_members enable row level security;
alter table public.property_agents enable row level security;

revoke insert, update, delete
  on public.companies, public.company_members,
     public.property_agents
  from anon;

drop policy if exists companies_select on public.companies;
create policy companies_select on public.companies
  for select using (true);

drop policy if exists companies_insert on public.companies;
create policy companies_insert on public.companies
  for insert to authenticated
  with check (
    id = auth.uid()
    and public.is_company_profile(auth.uid())
    and verification_status = 'unverified');

drop policy if exists companies_update on public.companies;
create policy companies_update on public.companies
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

drop policy if exists companies_delete on public.companies;
create policy companies_delete on public.companies
  for delete to authenticated
  using (public.is_admin());

drop policy if exists company_members_select
  on public.company_members;
create policy company_members_select on public.company_members
  for select using (
    status = 'active'
    or member_id = auth.uid()
    or company_id = auth.uid()
    or public.is_admin());

drop policy if exists company_members_insert
  on public.company_members;
create policy company_members_insert on public.company_members
  for insert to authenticated
  with check (
    company_id = auth.uid()
    and status = 'invited'
    and invited_by = auth.uid()
    and public.is_agent_profile(member_id));

drop policy if exists company_members_update
  on public.company_members;
create policy company_members_update on public.company_members
  for update to authenticated
  using (member_id = auth.uid() or company_id = auth.uid()
         or public.is_admin())
  with check (member_id = auth.uid() or company_id = auth.uid()
              or public.is_admin());

drop policy if exists property_agents_select
  on public.property_agents;
create policy property_agents_select on public.property_agents
  for select using (true);

drop policy if exists property_agents_insert
  on public.property_agents;
create policy property_agents_insert on public.property_agents
  for insert to authenticated
  with check (
    assigned_by = auth.uid()
    and public.property_company(property_id) = auth.uid()
    and exists (
      select 1 from public.company_members m
      where m.company_id = auth.uid()
        and m.member_id = agent_id
        and m.status = 'active'));

drop policy if exists property_agents_delete
  on public.property_agents;
create policy property_agents_delete on public.property_agents
  for delete to authenticated
  using (public.is_admin()
         or public.property_company(property_id) = auth.uid());
