# ARCHITECTURE: Remote Radar (Supabase-only)

Dokumen desain. Kebutuhan produk ada di `PRD.md`, aturan kerja untuk coding agent ada di `AGENTS.md`.

## 1. Gambaran umum

Tidak ada server sendiri. Semuanya ada di satu project Supabase.

```
┌────────────────────────── Supabase project ──────────────────────────┐
│                                                                      │
│  pg_cron ──(tiap 3 jam)──► pg_net http_post                          │
│                                   │  header x-cron-secret            │
│                                   ▼                                  │
│                         Edge Function: collect                       │
│                           1. claim_companies(8)   ◄──► Postgres      │
│                           2. fetch ATS (paralel)       companies     │
│                           3. upsert jobs               jobs          │
│                           4. filter + skor             settings      │
│                           5. kirim Telegram            runs          │
│                                   │                                  │
│  pg_cron (mingguan) ──► Edge Function: discover (V1)                 │
│                                                                      │
│  Auth + RLS ◄──────── Dashboard static (V1, hosting gratis)          │
└──────────────────────────────────────────────────────────────────────┘
          │ fetch                                   │ sendMessage
          ▼                                         ▼
  ATS public APIs                              Telegram Bot API
  (Greenhouse, Lever, Ashby, ...)
```

Prinsip: ambil data **langsung dari ATS**. Google tidak dipakai. Nama perusahaan baru ditemukan dari sumber gratis lain (lihat 3.2).

## 2. Layanan & batasnya

| Kebutuhan | Layanan | Catatan (cek lagi sebelum dipakai) |
|-----------|---------|-------------------------------------|
| Database | Supabase Postgres | Ada batas ukuran DB di plan Free; project free bisa di-pause kalau lama tidak aktif |
| Scheduler | `pg_cron` + `pg_net` | Ekstensi bawaan Supabase; aktifkan dari Dashboard → Database → Extensions |
| Compute | Supabase Edge Functions (Deno/TypeScript) | Plan Free: wall-clock 150 detik, **CPU time 2 detik per request** (waktu menunggu I/O tidak dihitung), maks 100 function per project, bundle maks 20 MB |
| Secret | Supabase Vault + Edge Function secrets | Nama secret Edge Function tidak boleh berawalan `SUPABASE_` |
| Login dashboard | Supabase Auth (magic link) | Satu user |
| Notifikasi | Telegram Bot API | Gratis |
| Frontend (V1) | Static app di Cloudflare Pages / Vercel / GitHub Pages | Hanya membaca Supabase lewat anon key + RLS |

Batas CPU 2 detik adalah kendala desain utama. Konsekuensinya dijelaskan di bagian 5.

## 3. Sumber data

### 3.1 ATS public API (utama)

Slug diambil dari URL career page, mis. `jobs.ashbyhq.com/plentific` → slug `plentific`.

| ATS | Endpoint | Fase |
|-----|----------|------|
| Greenhouse | `https://boards-api.greenhouse.io/v1/boards/{slug}/jobs` | MVP |
| Lever | `https://api.lever.co/v0/postings/{slug}?mode=json` | MVP |
| Ashby | `https://api.ashbyhq.com/posting-api/job-board/{slug}` | MVP |
| Workable | widget API per akun | V1 (verifikasi endpoint) |
| SmartRecruiters | `https://api.smartrecruiters.com/v1/companies/{id}/postings` | V1 (verifikasi) |
| Recruitee | `https://{slug}.recruitee.com/api/offers/` | V1 (verifikasi) |

Greenhouse sebaiknya tanpa `?content=true` di batch rutin karena responsnya besar dan memakan CPU saat di-parse. Untuk klasifikasi lokasi cukup judul dan field lokasi.

### 3.2 Discovery slug (V1, gratis)

Edge Function `discover`, jalan mingguan:

1. **Link apply di feed agregator gratis** (mis. Remotive, RemoteOK, We Work Remotely RSS, Arbeitnow, Jobicy): ekstrak slug dari URL ATS dengan regex. Dipakai hanya untuk menemukan perusahaan. Baca syarat atribusi dan rate limit masing-masing.
2. **HN "Who is hiring"** lewat Algolia HN API (`hn.algolia.com/api/v1`): ekstrak URL ATS dan nama perusahaan dari komentar.
3. **Seed manual**: CSV hasil dork `site:jobs.ashbyhq.com` yang dijalankan sendiri di browser, lalu import lewat Dashboard.

Slug baru masuk `companies` dengan `active = false` sampai satu fetch percobaan berhasil.

## 4. Struktur repo

```
remote-radar/
├─ supabase/
│  ├─ config.toml
│  ├─ migrations/                  # SQL berurutan (skema, RLS, RPC, cron)
│  ├─ seed.sql                     # perusahaan awal + settings default
│  └─ functions/
│     ├─ _shared/
│     │  ├─ types.ts               # Job, Adapter
│     │  ├─ ats/                   # greenhouse.ts, lever.ts, ashby.ts, index.ts
│     │  ├─ filter.ts              # kata kunci, lokasi, skor
│     │  ├─ telegram.ts
│     │  └─ db.ts                  # client supabase-js (service role)
│     ├─ collect/index.ts
│     └─ discover/index.ts         # V1
├─ testdata/                       # fixture JSON respons ATS
├─ web/                            # dashboard static (V1)
└─ .github/workflows/ci.yml        # deno fmt/lint/test (gratis, opsional)
```

## 5. Desain Edge Function `collect`

### 5.1 Pengambilan bergilir (karena batas CPU)

Satu invocation hanya memproses **batch kecil**. Cron memanggilnya sering, sehingga seluruh daftar tercakup bergantian.

Contoh angka: batch 8 perusahaan, cron tiap 3 jam (`0 */3 * * *`) → 8 invocation/hari → 64 fetch perusahaan/hari. Untuk 10–30 perusahaan, tiap perusahaan di-fetch kira-kira 2–6 kali sehari secara merata. Sesuaikan batch dan interval jika jumlah perusahaan bertambah banyak.

Klaim batch dilakukan di database supaya aman dari tumpang tindih:

```sql
create or replace function claim_companies(batch_size int)
returns setof companies
language sql
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
```

### 5.2 Alur satu invocation

1. Validasi header `x-cron-secret` terhadap secret fungsi (function di-deploy dengan `--no-verify-jwt`; keamanan lewat shared secret). Tolak jika tidak cocok.
2. Panggil `claim_companies(8)`.
3. Muat `settings` (profil dan aturan lokasi).
4. Fetch paralel (`Promise.allSettled`), timeout per request 10 detik, retry sekali untuk 429/5xx, hormati `Retry-After`.
5. Untuk tiap perusahaan berhasil: upsert jobs, set `last_seen_at`; lowongan perusahaan itu yang tidak muncul lagi diberi `closed_at`; `fail_count = 0`.
6. Untuk yang gagal: `fail_count + 1`, simpan `last_status`; jika melewati ambang → `active = false`.
7. Hitung `location_class` dan `match_score` untuk lowongan baru.
8. **Klaim notifikasi:** `update jobs set notified_at = now() where ... and notified_at is null returning *`, lalu kirim digest Telegram. Jika pengiriman gagal, kembalikan `notified_at = null`. Ini mencegah notifikasi ganda saat ada dua invocation.
9. Tulis satu baris ke `runs`.

### 5.3 Menjaga CPU tetap kecil

- Jangan `JSON.parse` respons berukuran besar untuk banyak perusahaan sekaligus; batas batch menjaga ini.
- Potong deskripsi (mis. 4.000 karakter) sebelum dianalisis atau disimpan.
- Hindari regex dengan backtracking berat; pakai pencarian substring pada teks yang sudah dinormalisasi (lowercase).
- Cache hasil `settings` di memori isolate selama beberapa menit.

### 5.4 Kontrak adapter

```ts
export interface Job {
  externalId: string;
  title: string;
  location: string;      // teks mentah
  remote: boolean;
  department?: string;
  url: string;           // link apply
  description?: string;  // teks polos, dipotong
  postedAt?: string;     // ISO
}

export interface Adapter {
  name: "greenhouse" | "lever" | "ashby";
  fetchJobs(slug: string, signal: AbortSignal): Promise<Job[]>;
}
```

Menambah ATS baru = satu file di `_shared/ats/` + registrasi di `index.ts` + fixture test.

### 5.5 Klasifikasi lokasi

Dievaluasi berurutan, daftar kata ada di `settings.location_rules`:

1. Ada kata `restricted` (US only, EU only, UK only, must reside in, work authorization, no visa sponsorship, kota/negara spesifik) → `restricted`.
2. Ada kata `eligible` (worldwide, anywhere, global, APAC, Asia, Southeast Asia, Indonesia) → `eligible`.
3. Selain itu → `unknown`.

Jika keduanya muncul, `restricted` menang, kecuali Indonesia/APAC/worldwide disebut eksplisit di judul atau lokasi.

### 5.6 Match score

0-100 dari: kecocokan judul dengan role target, jumlah stack yang muncul, kesesuaian level, dan penalti blacklist. Bobot di `settings.profile`.

## 6. Skema database

```sql
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
  key text primary key,            -- 'profile', 'location_rules'
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
```

### RLS

```sql
alter table companies enable row level security;
alter table jobs      enable row level security;
alter table settings  enable row level security;
alter table runs      enable row level security;

-- Dashboard: hanya user yang login (satu user pemilik) yang boleh baca/ubah.
-- Ganti dengan UUID user kamu setelah login pertama kali.
create policy owner_read_companies on companies for select using (auth.uid() = '<OWNER_UUID>');
create policy owner_read_jobs      on jobs      for select using (auth.uid() = '<OWNER_UUID>');
create policy owner_update_jobs    on jobs      for update using (auth.uid() = '<OWNER_UUID>');
create policy owner_read_runs      on runs      for select using (auth.uid() = '<OWNER_UUID>');
create policy owner_all_settings   on settings  for all    using (auth.uid() = '<OWNER_UUID>');
-- Edge Function memakai service role, yang melewati RLS.
```

## 7. Scheduler (pg_cron + pg_net)

Simpan URL project dan shared secret di Vault, bukan di teks SQL.

```sql
select vault.create_secret('https://<PROJECT_REF>.supabase.co', 'project_url');
select vault.create_secret('<RANDOM_STRING>', 'cron_secret');   -- sama dengan secret fungsi

select cron.schedule('collect-batch', '0 */3 * * *', $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
           || '/functions/v1/collect',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
$$);
```

Catatan:
- `net.http_post` bersifat asinkron dan bisa gagal diam-diam. Cek `net._http_response` sesekali, dan jadikan `runs` sebagai sumber kebenaran (kalau tidak ada baris baru dalam 4–6 jam, ada yang salah).
- Rentang tipikal untuk perusahaan yang jarang update lowongan bisa diperlebar; yang penting seluruh daftar tercakup beberapa kali sehari.
- Pembersihan & Retensi (60 Hari / 2 Bulan):
  - Cron harian (`daily-retention-cleanup`, jam 02:00 UTC) memanggil `cleanup_old_records()`.
  - Menghapus `jobs` yang berumur > 60 hari (`closed_at` > 60 hari atau `first_seen_at` > 60 hari).
  - Lowongan dengan status `saved` dan `applied` diproteksi agar tidak terhapus.
  - Lowongan yang dihapus dicatat ke `job_tombstones` agar bila lowongan tersebut masih tayang di web ATS, tidak memicu notifikasi Telegram ulang.
  - Menghapus log `runs` yang berumur > 60 hari.

## 8. Dashboard (V1)

- Static app (Next.js export atau Vite) di hosting gratis. Tidak ada API route atau server sendiri.
- Login lewat Supabase Auth (magic link), query langsung ke Supabase dengan anon key; RLS yang menjaga akses.
- Halaman: daftar lowongan (filter eligible, skor, perusahaan, status), detail, daftar perusahaan + status fetch, riwayat `runs`, editor `settings`.
- Service role key tidak pernah ada di frontend.

## 9. Etika & ketahanan scraping

- Urutan: API publik/JSON → RSS → HTML. HTML hanya jika `robots.txt` mengizinkan.
- User-Agent jelas dengan kontak, mis. `RemoteRadar/0.1 (+email)`.
- Batasi request paralel per batch dan hormati `Retry-After`.
- Tidak melewati login, CAPTCHA, atau pembatasan teknis.
- Batasi ukuran respons dan cek content-type sebelum parse.

## 10. Pengujian

- `deno test` untuk adapter berbasis fixture di `testdata/` (tanpa network).
- Table-driven test klasifikasi lokasi, termasuk kasus "EU; Berlin Office, no visa support" → `restricted`.
- Test idempotensi klaim notifikasi: dua pemanggilan paralel hanya mengirim sekali.
- Uji lokal dengan `supabase start` (Postgres + Edge Runtime lokal) sebelum deploy.
- CI opsional di GitHub Actions: `deno fmt --check`, `deno lint`, `deno test`.

## 11. Keputusan & alternatif

| Keputusan | Alasan | Alternatif |
|-----------|--------|------------|
| Supabase saja | Satu layanan, tanpa server, gratis, cocok dengan stack yang sudah dipakai | Cloudflare Workers + D1 |
| Edge Function + batch bergilir | Menghindari batas CPU 2 detik per request | Satu fungsi besar (berisiko timeout/CPU) |
| pg_cron + pg_net | Scheduler di dalam database, tanpa layanan lain | GitHub Actions cron memanggil fungsi |
| Aturan lokasi di tabel `settings` | Bisa di-tuning tanpa deploy | File JSON di bundle fungsi |
| Telegram | Instan di HP, API sederhana | Email lewat Resend/Brevo free tier |
| Discovery dari link apply + HN | Gratis dan legal | SERP API berbayar |
