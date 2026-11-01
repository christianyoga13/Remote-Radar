-- Seed settings (profile & location_rules) and initial remote-friendly companies

insert into settings (key, value) values
(
  'profile',
  '{
    "roles": ["fullstack", "full stack", "full-stack", "frontend", "front-end", "backend", "back-end", "software engineer", "product engineer", "web developer", "go developer", "golang", "react", "next.js", "flutter"],
    "stack": ["typescript", "react", "next.js", "nextjs", "go", "golang", "flutter", "postgres", "postgresql", "supabase", "node.js", "tailwind"],
    "levels": ["senior", "mid", "staff", "lead", "engineer ii", "engineer iii"],
    "blacklist": ["unpaid", "intern", "security clearance", "us citizen", "polygraph", "on-site only"],
    "min_score": 35,
    "max_fail_count": 5
  }'::jsonb
),
(
  'location_rules',
  '{
    "eligible": [
      "worldwide",
      "anywhere",
      "global",
      "work from anywhere",
      "apac",
      "asia",
      "southeast asia",
      "sea",
      "indonesia",
      "jakarta",
      "gmt+7",
      "utc+7"
    ],
    "restricted": [
      "us only",
      "u.s. only",
      "united states only",
      "eu only",
      "uk only",
      "canada only",
      "north america only",
      "latam only",
      "emea only",
      "must reside in",
      "work authorization",
      "no visa sponsorship",
      "no visa support",
      "unable to sponsor",
      "us-remote",
      "remote - us",
      "remote (us)"
    ]
  }'::jsonb
)
on conflict (key) do update set value = excluded.value, updated_at = now();

insert into companies (name, ats, slug, careers_url, active) values
  ('GitLab', 'greenhouse', 'gitlab', 'https://boards.greenhouse.io/gitlab', true),
  ('Grafana Labs', 'greenhouse', 'grafanalabs', 'https://boards.greenhouse.io/grafanalabs', true),
  ('Canonical', 'greenhouse', 'canonical', 'https://boards.greenhouse.io/canonical', true),
  ('Sourcegraph', 'greenhouse', 'sourcegraph91', 'https://boards.greenhouse.io/sourcegraph91', true),
  ('Supabase', 'ashby', 'supabase', 'https://jobs.ashbyhq.com/supabase', true),
  ('Linear', 'ashby', 'linear', 'https://jobs.ashbyhq.com/linear', true),
  ('PostHog', 'ashby', 'posthog', 'https://jobs.ashbyhq.com/posthog', true),
  ('Cal.com', 'ashby', 'cal', 'https://jobs.ashbyhq.com/cal', true)
on conflict (ats, slug) do nothing;
