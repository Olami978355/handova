-- Applied to production: logged-out visitors can read approved lawyers' public fields only.
revoke all on public.lawyer_verifications from anon;
grant select (user_id, specialty, states_covered, status, default_fee)
  on public.lawyer_verifications to anon;
create policy "lawyer_verifications_public_read_approved_anon"
  on public.lawyer_verifications for select to anon
  using (status = 'approved');
-- Rollback:
-- drop policy "lawyer_verifications_public_read_approved_anon" on public.lawyer_verifications;
