-- Migration: 20261101070000_allow_anon_manage_companies.sql
-- Description: Allow anon role to insert/update companies and update job status (saved/applied/ignored)

-- 1. Allow anon to manage companies (add company, toggle active)
create policy "Allow anon insert on companies" on companies
  for insert
  with check (true);

create policy "Allow anon update on companies" on companies
  for update
  using (true)
  with check (true);

-- 2. Allow anon to update job status (e.g. marking jobs as saved, applied, ignored)
create policy "Allow anon update on jobs" on jobs
  for update
  using (true)
  with check (true);
