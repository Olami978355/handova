-- A booked lawyer currently cannot read the deal they're assigned to
-- review (deals_select only covers tenant/landlord/agent/staff/accepted
-- delegates) or view the agreement PDF in the 'agreements' storage
-- bucket. Both are needed for the verdict screen to function at all.

create or replace function public.is_assigned_lawyer(p_deal_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.lawyer_review_bookings
    where deal_id = p_deal_id
      and lawyer_id = p_user_id
      and status in ('paid', 'verdict_submitted')
  );
$$;

grant execute on function public.is_assigned_lawyer(uuid, uuid) to authenticated;

create policy "deals_select_assigned_lawyer"
  on public.deals for select
  using (public.is_assigned_lawyer(id, auth.uid()));

create policy "Assigned lawyer can view agreement docs"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'agreements'
  and exists (
    select 1 from public.deals
    where deals.id::text = (storage.foldername(name))[1]
      and public.is_assigned_lawyer(deals.id, auth.uid())
  )
);
