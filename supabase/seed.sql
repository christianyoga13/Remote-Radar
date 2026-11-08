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

insert into companies (name, ats, slug, careers_url, active, region, remote_policy, source) values
  ('Automattic', 'greenhouse', 'automattic', 'https://boards.greenhouse.io/automattic', true, 'worldwide', 'fully-remote', 'remoteintech'),
  ('GitLab', 'greenhouse', 'gitlab', 'https://boards.greenhouse.io/gitlab', true, 'worldwide', 'fully-remote', 'remoteintech'),
  ('Buffer', 'ashby', 'buffer', 'https://jobs.ashbyhq.com/buffer', true, 'worldwide', 'fully-remote', 'remoteintech'),
  ('DuckDuckGo', 'greenhouse', 'duckduckgo', 'https://boards.greenhouse.io/duckduckgo', true, 'worldwide', 'fully-remote', 'remoteintech'),
  ('Grafana Labs', 'greenhouse', 'grafanalabs', 'https://boards.greenhouse.io/grafanalabs', true, 'worldwide', 'remote-first', 'remoteintech'),
  ('Canonical', 'greenhouse', 'canonical', 'https://boards.greenhouse.io/canonical', true, 'worldwide', 'remote-first', 'remoteintech'),
  ('Sourcegraph', 'greenhouse', 'sourcegraph91', 'https://boards.greenhouse.io/sourcegraph91', true, 'worldwide', 'remote-first', 'remoteintech'),
  ('Supabase', 'ashby', 'supabase', 'https://jobs.ashbyhq.com/supabase', true, 'worldwide', 'remote-first', 'manual'),
  ('Linear', 'ashby', 'linear', 'https://jobs.ashbyhq.com/linear', true, 'worldwide', 'remote-first', 'manual'),
  ('PostHog', 'ashby', 'posthog', 'https://jobs.ashbyhq.com/posthog', true, 'worldwide', 'fully-remote', 'remoteintech'),
  ('Cal.com', 'ashby', 'cal', 'https://jobs.ashbyhq.com/cal', true, 'worldwide', 'fully-remote', 'remoteintech'),
  ('Ghost', 'greenhouse', 'ghost', 'https://boards.greenhouse.io/ghost', true, 'worldwide', 'fully-remote', 'remoteintech'),
  ('10up', 'greenhouse', '10up', 'https://boards.greenhouse.io/10up', true, 'worldwide', 'fully-remote', 'remoteintech'),
  ('Hotjar', 'greenhouse', 'hotjar', 'https://boards.greenhouse.io/hotjar', true, 'worldwide', 'fully-remote', 'remoteintech'),
  ('Zapier', 'greenhouse', 'zapier', 'https://boards.greenhouse.io/zapier', true, 'worldwide', 'fully-remote', 'remoteintech'),
  ('Kinsta', 'lever', 'kinsta', 'https://jobs.lever.co/kinsta', true, 'worldwide', 'remote-first', 'remoteintech'),
  ('Synthesia', 'ashby', 'synthesia', 'https://jobs.ashbyhq.com/synthesia', true, 'worldwide', 'remote-first', 'remoteintech'),
  ('Doppler', 'ashby', 'doppler', 'https://jobs.ashbyhq.com/doppler', true, 'worldwide', 'remote-first', 'remoteintech')
on conflict (ats, slug) do update set
  region = excluded.region,
  remote_policy = excluded.remote_policy,
  source = excluded.source;
