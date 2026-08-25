-- auto-expire-decisions has existed since before this session but was
-- never actually scheduled anywhere - pg_cron wasn't enabled until we
-- added it for the lawyer refund job. This closes that same gap for
-- inspection booking auto-decline, which has likely never fired
-- automatically in production until now.
select cron.schedule(
  'auto-expire-inspection-decisions',
  '*/30 * * * *',
  $$
  select net.http_post(
    url := 'https://huvczugwcphcptblwbym.supabase.co/functions/v1/auto-expire-decisions',
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
