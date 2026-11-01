-- Allow anon role (public dashboard visitors) to read jobs, companies, runs, and settings
-- Mutation policies remain restricted to authenticated owner.

create policy anon_read_jobs on jobs for select to anon using (true);
create policy anon_read_companies on companies for select to anon using (true);
create policy anon_read_runs on runs for select to anon using (true);
create policy anon_read_settings on settings for select to anon using (true);
