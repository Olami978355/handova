-- Storage bucket for lawyer verification certificate uploads.
-- Mirrors the agreements bucket pattern: folder-scoped by owner,
-- separate insert/update/select policies since upsert requires both
-- insert and update to pass regardless of whether a row exists yet.
--
-- Folder structure: lawyer-certs/{user_id}/cert.pdf

insert into storage.buckets (id, name, public)
values ('lawyer-certs', 'lawyer-certs', false)
on conflict (id) do nothing;

create policy "Applicant can upload own lawyer cert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'lawyer-certs'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Applicant can update own lawyer cert"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'lawyer-certs'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'lawyer-certs'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Applicant and admins can view lawyer cert"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'lawyer-certs'
  and (
    auth.uid()::text = (storage.foldername(name))[1]
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'moderator')
    )
  )
);
