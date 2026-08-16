select cron.schedule(
  'release-inspection-fees',
  '*/30 * * * *',
  $$
  select net.http_post(
    url := 'https://huvczugwcphcptblwbym.supabase.co/functions/v1/release-inspection-fees',
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
