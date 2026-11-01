-- Remote Radar schema, RPCs, and RLS policies (ARCHITECTURE.md section 5 & 6)

create table companies (
  id bigserial primary key,
  name text not null,
  ats text not null check (ats in ('greenhouse','lever','ashby','workable','smartrecruiters','recruitee')),
  slug text not null,
  careers_url text,
  active boolean not null default true,
  fail_count int not null default 0,
  last_status text,
  last_fetched_at timestamptz,
  unique (ats, slug)
);

create table jobs (
  id bigserial primary key,
  company_id bigint not null references companies(id) on delete cascade,
  external_id text not null,
  title text not null,
  location_raw text,
  location_class text not null default 'unknown' check (location_class in ('eligible','restricted','unknown')),
  is_remote boolean not null default false,
  department text,
  url text not null,
  description text,
  posted_at timestamptz,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  closed_at timestamptz,
  match_score int,
  notified_at timestamptz,
  status text not null default 'new' check (status in ('new','saved','applied','ignored')),
  unique (company_id, external_id)
);

create table settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table runs (
  id bigserial primary key,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  companies_ok int default 0,
  companies_failed int default 0,
  jobs_new int default 0,
  jobs_closed int default 0,
  notes text
);

create index on jobs (first_seen_at desc);
create index on jobs (company_id) where closed_at is null;
create index on companies (last_fetched_at nulls first) where active;

-- Claim a small batch of active companies using SKIP LOCKED so overlapping invocations never collide.
create or replace function claim_companies(batch_size int default 8)
returns setof companies
language sql
security definer
as $$
  update companies c
     set last_fetched_at = now()
   where c.id in (
     select id from companies
      where active
      order by last_fetched_at nulls first
      limit batch_size
      for update skip locked
   )
  returning c.*;
$$;

-- Atomically claim unnotified remote jobs that are not restricted and meet min_score.
create or replace function claim_unnotified_jobs(min_score int default 40)
returns table (
  id bigint,
  company_name text,
  title text,
  location_raw text,
  location_class text,
  match_score int,
  url text
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
    claimed.url
  from claimed
  join companies c on c.id = claimed.company_id;
$$;

-- Row Level Security (mandatory on all tables per AGENTS.md)
alter table companies enable row level security;
alter table jobs      enable row level security;
alter table settings  enable row level security;
alter table runs      enable row level security;

-- Single-user personal tool: replace auth.role() = 'authenticated' with auth.uid() = '<OWNER_UUID>'
-- once the owner user is created in Supabase Auth.
create policy owner_all_companies on companies for all    using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy owner_read_jobs     on jobs      for select using (auth.role() = 'authenticated');
create policy owner_update_jobs   on jobs      for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy owner_read_runs     on runs      for select using (auth.role() = 'authenticated');
create policy owner_all_settings  on settings  for all    using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
