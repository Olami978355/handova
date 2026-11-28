-- Property-specific offers. These records never modify properties.price.
create table public.property_offers (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  updated_by uuid references auth.users(id),
  offer_type text not null check (
    offer_type in ('price_reduction', 'rent_incentive', 'flexible_payment')
  ),
  headline text not null check (length(trim(headline)) between 3 and 100),
  description text check (description is null or length(description) <= 2000),
  reference_price numeric(14,2),
  offer_price numeric(14,2),
  payment_terms text check (payment_terms is null or length(payment_terms) <= 1000),
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  status text not null default 'active'
    check (status in ('active', 'withdrawn', 'expired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_at is null or expires_at > starts_at),
  check (
    (offer_type = 'price_reduction'
      and reference_price is not null and reference_price > 0
      and offer_price is not null and offer_price > 0
      and offer_price < reference_price)
    or
    (offer_type <> 'price_reduction'
      and offer_price is null)
  ),
  check (
    offer_type <> 'flexible_payment'
    or payment_terms is not null
  )
);

create unique index property_offers_one_active_per_property
  on public.property_offers(property_id)
  where status = 'active';

create index property_offers_public_lookup
  on public.property_offers(property_id, starts_at, expires_at)
  where status = 'active';

alter table public.property_offers enable row level security;

revoke all on public.property_offers from public, anon, authenticated;

grant select (
  id, property_id, offer_type, headline, description,
  reference_price, offer_price, payment_terms,
  starts_at, expires_at, status, created_at, updated_at
) on public.property_offers to anon, authenticated;

grant all on public.property_offers to service_role;

create policy property_offers_public_active_read
  on public.property_offers
  for select
  to anon, authenticated
  using (
    status = 'active'
    and starts_at <= now()
    and (expires_at is null or expires_at > now())
    and exists (
      select 1
      from public.properties p
      where p.id = property_offers.property_id
        and p.status = 'active'
        and p.deleted_at is null
        and p.is_delisted = false
    )
  );

-- Audit snapshots preserve previous offer terms when an offer is edited
-- or withdrawn. No client-facing write access is granted to this table.
create table public.property_offer_events (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null,
  property_id uuid not null,
  actor_id uuid,
  event_type text not null check (
    event_type in ('created', 'updated', 'withdrawn', 'expired')
  ),
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz not null default now()
);

alter table public.property_offer_events enable row level security;

revoke all on public.property_offer_events from public, anon, authenticated;
grant all on public.property_offer_events to service_role;

create or replace function public.audit_property_offer_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if TG_OP = 'INSERT' then
    insert into public.property_offer_events
      (offer_id, property_id, actor_id, event_type, new_values)
    values
      (NEW.id, NEW.property_id, NEW.created_by, 'created', jsonb_build_object(
        'offer_type', NEW.offer_type,
        'headline', NEW.headline,
        'description', NEW.description,
        'reference_price', NEW.reference_price,
        'offer_price', NEW.offer_price,
        'payment_terms', NEW.payment_terms,
        'starts_at', NEW.starts_at,
        'expires_at', NEW.expires_at,
        'status', NEW.status
      ));
    return NEW;
  end if;

  insert into public.property_offer_events
    (offer_id, property_id, actor_id, event_type, old_values, new_values)
  values (
    NEW.id,
    NEW.property_id,
    NEW.updated_by,
    case
      when NEW.status = 'withdrawn' then 'withdrawn'
      when NEW.status = 'expired' then 'expired'
      else 'updated'
    end,
    jsonb_build_object(
      'offer_type', OLD.offer_type,
      'headline', OLD.headline,
      'description', OLD.description,
      'reference_price', OLD.reference_price,
      'offer_price', OLD.offer_price,
      'payment_terms', OLD.payment_terms,
      'starts_at', OLD.starts_at,
      'expires_at', OLD.expires_at,
      'status', OLD.status
    ),
    jsonb_build_object(
        'offer_type', NEW.offer_type,
        'headline', NEW.headline,
        'description', NEW.description,
        'reference_price', NEW.reference_price,
        'offer_price', NEW.offer_price,
        'payment_terms', NEW.payment_terms,
        'starts_at', NEW.starts_at,
        'expires_at', NEW.expires_at,
        'status', NEW.status
      )
  );

  return NEW;
end;
$$;

create trigger trg_audit_property_offer_change
  after insert or update on public.property_offers
  for each row execute function public.audit_property_offer_change();

revoke all on function public.audit_property_offer_change()
  from public, anon, authenticated;
