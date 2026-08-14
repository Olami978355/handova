-- The directory needs to show approved lawyers to any logged-in user,
-- but the existing RLS only allows an applicant to see their own row
-- or an admin/moderator to see any row. This adds narrow public read
-- access limited strictly to approved rows - pending/rejected
-- applications remain visible only to the applicant and admins.

create policy "lawyer_verifications_public_read_approved"
on public.lawyer_verifications
for select
to authenticated
using (status = 'approved');
