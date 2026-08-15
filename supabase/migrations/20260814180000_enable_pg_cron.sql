-- Enables scheduled jobs. Required for the lawyer-fee auto-refund
-- cron job, and could also fix auto-expire-decisions (inspection
-- bookings), which currently has no scheduler calling it at all -
-- pg_cron never having been enabled means that function has likely
-- never fired automatically in production.
create extension if not exists pg_cron;
