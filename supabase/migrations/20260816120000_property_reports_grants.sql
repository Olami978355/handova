-- property_reports was missing base GRANTs for the authenticated role
-- entirely (only service_role and postgres had access), causing every
-- insert from a logged-in user to silently fail with a 42501
-- permission-denied error. The client code also wasn't checking for
-- the error (fixed separately), so it looked like clicking "Submit
-- Report" did nothing at all.
grant select, insert on public.property_reports to authenticated;
