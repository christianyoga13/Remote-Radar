-- Enable pg_cron and pg_net extensions for automated periodic scheduling
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- Unschedule any existing 'collect-batch' job if present
do $$
begin
  if exists (select 1 from cron.job where jobname = 'collect-batch') then
    perform cron.unschedule('collect-batch');
  end if;
end;
$$;

-- Schedule collect-batch every 3 hours (00:00, 03:00, 06:00, 09:00, 12:00, 15:00, 18:00, 21:00 UTC)
-- Runs 8 times a day, invoking Edge Function collect via net.http_post
select cron.schedule(
  'collect-batch',
  '0 */3 * * *',
  $$
    select net.http_post(
      url := coalesce(
        (select decrypted_secret from vault.decrypted_secrets where name = 'project_url' limit 1),
        'https://jcmfngjfdcvizsjcfcbo.supabase.co'
      ) || '/functions/v1/collect',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', coalesce(
          (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret' limit 1),
          'remote-job-radar-portal'
        )
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 120000
    );
  $$
);

-- Daily retention cleanup: purge closed jobs older than 60 days and runs older than 30 days
do $$
begin
  if exists (select 1 from cron.job where jobname = 'daily-retention-cleanup') then
    perform cron.unschedule('daily-retention-cleanup');
  end if;
end;
$$;

select cron.schedule(
  'daily-retention-cleanup',
  '0 2 * * *',
  $$
    delete from jobs where closed_at is not null and closed_at < now() - interval '60 days';
    delete from runs where started_at < now() - interval '30 days';
  $$
);
