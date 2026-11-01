-- Migration: 20261101040000_rescore_jobs.sql
-- Description: Adds a Postgres RPC to rescore active jobs based on updated profile settings

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
  v_min_score integer;
  v_rescored_count integer := 0;
  v_job record;
  v_score integer;
  v_stack_hits integer;
  v_item text;
  v_body text;
  v_title text;
  v_is_blacklisted boolean;
begin
  -- 1. Load active profile settings
  select value into v_profile from settings where key = 'profile';
  if v_profile is null then
    return jsonb_build_object('success', false, 'message', 'Profile settings not found');
  end if;

  v_roles := coalesce(v_profile->'roles', '[]'::jsonb);
  v_stack := coalesce(v_profile->'stack', '[]'::jsonb);
  v_levels := coalesce(v_profile->'levels', '[]'::jsonb);
  v_blacklist := coalesce(v_profile->'blacklist', '[]'::jsonb);
  v_min_score := coalesce((v_profile->>'min_score')::integer, 40);

  -- 2. Iterate through all open jobs and recalculate score
  for v_job in select id, title, location_raw, location_class, is_remote, description from jobs where closed_at is null loop
    v_score := 0;
    v_is_blacklisted := false;
    v_title := lower(coalesce(v_job.title, ''));
    v_body := v_title || ' ' || lower(coalesce(v_job.description, ''));

    -- Restricted or non-remote jobs stay 0
    if not coalesce(v_job.is_remote, true) or coalesce(v_job.location_class, 'unknown') = 'restricted' then
      v_score := 0;
    else
      -- Check blacklist
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

-- Allow anon and authenticated users to call rescore_jobs RPC
grant execute on function rescore_jobs() to anon, authenticated, service_role;
