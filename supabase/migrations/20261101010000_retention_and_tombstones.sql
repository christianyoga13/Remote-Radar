-- Retention and Tombstones: purge data older than 60 days while protecting saved/applied jobs
-- and preventing re-notification of evergreen jobs still active on ATS.

create table if not exists job_tombstones (
  company_id bigint not null references companies(id) on delete cascade,
  external_id text not null,
  archived_at timestamptz not null default now(),
  primary key (company_id, external_id)
);

alter table job_tombstones enable row level security;
create policy owner_read_tombstones on job_tombstones for select using (auth.role() = 'authenticated');

-- Function to safely cleanup old records:
-- 1. Keeps 'saved' and 'applied' jobs intact.
-- 2. Records deleted job external_ids in job_tombstones so they never trigger duplicate Telegram alerts.
-- 3. Deletes jobs older than 60 days (2 months).
-- 4. Deletes runs logs older than 60 days (2 months).
create or replace function cleanup_old_records()
returns void
language plpgsql
security definer
as $$
begin
  -- 1. Archive to tombstone before deleting
  insert into job_tombstones (company_id, external_id)
  select company_id, external_id
  from jobs
  where (
    (closed_at is not null and closed_at < now() - interval '60 days')
    or
    (first_seen_at < now() - interval '60 days')
  )
  and status not in ('saved', 'applied')
  on conflict (company_id, external_id) do nothing;

  -- 2. Delete jobs older than 60 days (preserving 'saved' and 'applied')
  delete from jobs
  where (
    (closed_at is not null and closed_at < now() - interval '60 days')
    or
    (first_seen_at < now() - interval '60 days')
  )
  and status not in ('saved', 'applied');

  -- 3. Delete runs older than 60 days
  delete from runs
  where started_at < now() - interval '60 days';
end;
$$;

-- Update daily-retention-cleanup cron job to run cleanup_old_records() at 02:00 UTC daily
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
    select cleanup_old_records();
  $$
);
