# Remote Radar

Personal remote job vacancy monitor running 100% on Supabase (`Postgres` + `pg_cron` + `pg_net` + `Edge Functions` + `Auth/RLS`) with a static Next.js dashboard (`web/`).

Read the three mandatory project documents before modifying anything:
- [`AGENTS.md`](./AGENTS.md) — Coding conventions, runtime limits, scraping rules, security, and definition of done.
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — System design, database schema, RLS, `collect` & `discover` Edge Functions, and static dashboard.
- [`PRD.md`](./PRD.md) — Product requirements, user stories, and release plan.
- [`.agent/rules/remote-radar.md`](./.agent/rules/remote-radar.md) — Workspace rule enforced automatically by Antigravity.

## Quick Start

### 1. Supabase Local Stack & Edge Functions
```bash
cp .env.example .env.local
supabase start
supabase db reset
supabase functions serve collect --no-verify-jwt --env-file .env.local
```

Run Edge Function unit tests (offline fixtures):
```bash
cd supabase/functions
deno fmt --check && deno lint
deno test --allow-read
```

### 2. Next.js Static Dashboard (`web/`)
```bash
cd web
cp .env.example .env.local
npm install
npm run dev
```

Build static export (`web/out/`):
```bash
cd web
npm run build
```
