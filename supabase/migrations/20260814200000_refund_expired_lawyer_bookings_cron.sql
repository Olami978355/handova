-- Every 30 minutes, calls the refund-expired-lawyer-bookings Edge
-- Function, which finds paid lawyer_review_bookings past their
-- response_deadline with no verdict submitted, refunds the lawyer's
-- fee only (platform_fee is kept per product decision), and marks
-- the booking expired.
--
-- The service role key is read from Vault at execution time (stored
-- manually via vault.create_secret, name 'cron_service_role_key') so
-- it never appears in this file or git history.

select cron.schedule(
  'refund-expired-lawyer-bookings',
  '*/30 * * * *',
  $$
  select net.http_post(
    url := 'https://huvczugwcphcptblwbym.supabase.co/functions/v1/refund-expired-lawyer-bookings',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets
        where name = 'cron_service_role_key'
      )
    ),
    body := '{}'::jsonb
  );
  $$
);
