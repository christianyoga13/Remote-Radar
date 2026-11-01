-- Migration: 20261101050000_update_profile_and_rescore.sql
-- Description: RPC to safely update profile settings and optionally trigger rescoring

create or replace function update_profile_and_rescore(
  p_profile jsonb,
  p_trigger_rescore boolean default true
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_res jsonb := null;
begin
  -- Upsert profile setting
  insert into settings (key, value, updated_at)
  values ('profile', p_profile, now())
  on conflict (key) do update
  set value = excluded.value, updated_at = now();

  -- Recalculate match scores if requested
  if p_trigger_rescore then
    v_res := rescore_jobs();
  end if;

  return jsonb_build_object(
    'success', true,
    'rescore', v_res
  );
end;
$$;

grant execute on function update_profile_and_rescore(jsonb, boolean) to anon, authenticated, service_role;
