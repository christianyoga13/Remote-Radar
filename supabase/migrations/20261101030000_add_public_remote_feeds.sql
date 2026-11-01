-- Add public remote feeds (remotive, arbeitnow) to companies.ats constraint
-- and insert default public remote feed sources so the system continuously
-- pulls global remote tech vacancies beyond individual company boards.

alter table companies drop constraint if exists companies_ats_check;
alter table companies add constraint companies_ats_check
  check (ats in (
    'greenhouse',
    'lever',
    'ashby',
    'workable',
    'smartrecruiters',
    'recruitee',
    'remotive',
    'arbeitnow'
  ));

-- Insert default public remote feed sources
insert into companies (name, ats, slug, careers_url, active) values
  ('Remotive (Global Remote Tech)', 'remotive', 'software-dev', 'https://remotive.com/remote-jobs/software-dev', true),
  ('Arbeitnow (Worldwide Remote Feed)', 'arbeitnow', 'remote', 'https://www.arbeitnow.com', true)
on conflict (ats, slug) do nothing;
