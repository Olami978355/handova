-- Fixes the agreements storage bucket RLS policies.
--
-- Original INSERT policy referenced a bucket called 'agreement-docs',
-- which was never created — the actual code uploads to 'agreements'.
-- This alone caused every agreement upload to fail.
--
-- Even after fixing the bucket name, uploads still failed because the
-- frontend uses { upsert: true }, which causes Postgres to plan the
-- operation as INSERT ... ON CONFLICT DO UPDATE. This requires BOTH
-- an INSERT and an UPDATE policy to pass, regardless of whether a
-- conflicting row actually exists. A SELECT policy is also required,
-- since Storage's upsert path checks for an existing object first.

drop policy if exists "Landlords/Agents can upload agreement docs" on storage.objects;

create policy "Landlords/Agents can upload agreement docs"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'agreements'
  and exists (
    select 1 from deals
    where deals.id::text = (storage.foldername(name))[1]
      and (auth.uid() = deals.landlord_id or auth.uid() = deals.agent_id)
  )
);

create policy "Landlords/Agents can update agreement docs"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'agreements'
  and exists (
    select 1 from deals
    where deals.id::text = (storage.foldername(name))[1]
      and (auth.uid() = deals.landlord_id or auth.uid() = deals.agent_id)
  )
)
with check (
  bucket_id = 'agreements'
  and exists (
    select 1 from deals
    where deals.id::text = (storage.foldername(name))[1]
      and (auth.uid() = deals.landlord_id or auth.uid() = deals.agent_id)
  )
);

create policy "Landlords/Agents/Tenants can view agreement docs"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'agreements'
  and exists (
    select 1 from deals
    where deals.id::text = (storage.foldername(name))[1]
      and (
        auth.uid() = deals.landlord_id
        or auth.uid() = deals.agent_id
        or auth.uid() = deals.tenant_id
      )
  )
);
