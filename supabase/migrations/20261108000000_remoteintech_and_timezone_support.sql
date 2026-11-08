-- Migration: 20261108000000_remoteintech_and_timezone_support.sql
-- Description: Add remoteintech company metadata (region, remote_policy, source) and job timezone/async support

-- 1. Extend companies table with remoteintech metadata
alter table companies
  add column if not exists region text check (region is null or region in ('worldwide', 'asia-pacific', 'americas', 'europe', 'americas-europe', 'other')),
  add column if not exists remote_policy text check (remote_policy is null or remote_policy in ('fully-remote', 'remote-first', 'remote-friendly', 'hybrid')),
  add column if not exists source text not null default 'manual';

-- 2. Extend jobs table with timezone and asynchronous culture indicators
alter table jobs
  add column if not exists timezone_note text,
  add column if not exists is_async boolean not null default false;

-- 3. Update claim_unnotified_jobs RPC to return timezone_note and company metadata
drop function if exists claim_unnotified_jobs(integer);

create or replace function claim_unnotified_jobs(min_score int default 0)
returns table (
  id bigint,
  company_name text,
  title text,
  location_raw text,
  location_class text,
  match_score int,
  url text,
  timezone_note text,
  is_async boolean,
  company_region text,
  company_remote_policy text
)
language sql
security definer
as $$
  with claimed as (
    update jobs j
       set notified_at = now()
     where j.id in (
       select j2.id
         from jobs j2
        where j2.notified_at is null
          and j2.closed_at is null
          and j2.is_remote = true
          and j2.location_class in ('eligible', 'unknown')
          and coalesce(j2.match_score, 0) >= min_score
        order by j2.match_score desc nulls last, j2.first_seen_at desc
        limit 25
        for update skip locked
     )
    returning j.*
  )
  select
    claimed.id,
    c.name as company_name,
    claimed.title,
    claimed.location_raw,
    claimed.location_class,
    claimed.match_score,
    claimed.url,
    claimed.timezone_note,
    claimed.is_async,
    c.region as company_region,
    c.remote_policy as company_remote_policy
  from claimed
  join companies c on c.id = claimed.company_id;
$$;

grant execute on function claim_unnotified_jobs(integer) to anon, authenticated, service_role;

-- 4. Update rescore_jobs to include timezone and remoteintech boosts
create or replace function rescore_jobs()
returns jsonb
language plpgsql
security definer
as $$
declare
  v_profile jsonb;
  v_roles jsonb;
  v_stack jsonb;
  v_levels jsonb;
  v_blacklist jsonb;
  v_rescored_count integer := 0;
  v_job record;
  v_score integer;
  v_stack_hits integer;
  v_item text;
  v_body text;
  v_title text;
  v_is_blacklisted boolean;
begin
  select value into v_profile from settings where key = 'profile';
  if v_profile is null then
    return jsonb_build_object('success', false, 'message', 'Profile settings not found');
  end if;

  v_roles := coalesce(v_profile->'roles', '[]'::jsonb);
  v_stack := coalesce(v_profile->'stack', '[]'::jsonb);
  v_levels := coalesce(v_profile->'levels', '[]'::jsonb);
  v_blacklist := coalesce(v_profile->'blacklist', '[]'::jsonb);

  for v_job in
    select
      j.id,
      j.title,
      j.location_raw,
      j.location_class,
      j.is_remote,
      j.description,
      j.is_async,
      c.region as company_region,
      c.remote_policy as company_remote_policy
    from jobs j
    join companies c on c.id = j.company_id
    where j.closed_at is null
  loop
    v_score := 0;
    v_is_blacklisted := false;
    v_title := lower(coalesce(v_job.title, ''));
    v_body := v_title || ' ' || lower(coalesce(v_job.description, ''));

    if not coalesce(v_job.is_remote, true) or coalesce(v_job.location_class, 'unknown') = 'restricted' then
      v_score := 0;
    else
      for v_item in select jsonb_array_elements_text(v_blacklist) loop
        if length(trim(v_item)) > 0 and position(lower(trim(v_item)) in v_body) > 0 then
          v_is_blacklisted := true;
          exit;
        end if;
      end loop;

      if v_is_blacklisted then
        v_score := 0;
      else
        -- Role match (45 pts in title, 20 pts in description)
        for v_item in select jsonb_array_elements_text(v_roles) loop
          if length(trim(v_item)) > 0 then
            if position(lower(trim(v_item)) in v_title) > 0 then
              v_score := v_score + 45;
              exit;
            elsif position(lower(trim(v_item)) in v_body) > 0 then
              v_score := v_score + 20;
              exit;
            end if;
          end if;
        end loop;

        -- Stack hits (12 pts each, max 36 pts)
        v_stack_hits := 0;
        for v_item in select jsonb_array_elements_text(v_stack) loop
          if length(trim(v_item)) > 0 and position(lower(trim(v_item)) in v_body) > 0 then
            v_stack_hits := v_stack_hits + 1;
          end if;
        end loop;
        v_score := v_score + least(v_stack_hits * 12, 36);

        -- Seniority level match (10 pts)
        for v_item in select jsonb_array_elements_text(v_levels) loop
          if length(trim(v_item)) > 0 and (position(lower(trim(v_item)) in v_title) > 0 or position(lower(trim(v_item)) in v_body) > 0) then
            v_score := v_score + 10;
            exit;
          end if;
        end loop;

        -- Location bonus (9 pts for explicit eligible)
        if v_job.location_class = 'eligible' then
          v_score := v_score + 9;
        end if;

        -- Async / Flexible timezone bonus (+5 pts)
        if coalesce(v_job.is_async, false) = true then
          v_score := v_score + 5;
        end if;

        -- Remoteintech verified worldwide/APAC company bonus (+5 pts)
        if v_job.company_region in ('worldwide', 'asia-pacific') then
          v_score := v_score + 5;
        end if;

        v_score := least(v_score, 100);
      end if;
    end if;

    update jobs set match_score = v_score where id = v_job.id and match_score is distinct from v_score;
    v_rescored_count := v_rescored_count + 1;
  end loop;

  return jsonb_build_object(
    'success', true,
    'rescored_jobs', v_rescored_count
  );
end;
$$;

grant execute on function rescore_jobs() to anon, authenticated, service_role;
