---
trigger: always_on
description: Mandatory project rules from AGENTS.md, ARCHITECTURE.md, and PRD.md for Remote Radar.
---

# Remote Radar Mandatory Rules

Setiap perubahan kode di repositori ini **WAJIB** mematuhi ketiga dokumen utama di root project:
1. `AGENTS.md` — Konvensi kode, batas runtime Edge Function, aturan scraping, keamanan & privasi, dan definisi selesai.
2. `ARCHITECTURE.md` — Desain arsitektur Supabase-only, kontrak adapter ATS, skema DB + RLS, `claim_companies` RPC, dan static dashboard.
3. `PRD.md` — Tujuan produk, fitur MVP/V1, dan kebutuhan fungsional/non-fungsional.

## Ringkasan Aturan Wajib (Non-Negotiable)

- **Supabase-Only Architecture**: Tidak boleh ada backend/server sendiri di luar Supabase. Semua proses background berjalan di Supabase Edge Functions (`collect`, `discover`) yang dipicu `pg_cron` + `pg_net`.
- **Next.js Static Dashboard (`web/`)**: Frontend di `web/` wajib berupa static export (`output: 'export'`), tanpa Next.js API routes atau server actions yang butuh Node server. Hanya memakai `@supabase/supabase-js` dengan anon key + Supabase Auth (magic link) + RLS.
- **Keamanan & Privasi**:
  - RLS wajib aktif di semua tabel (`companies`, `jobs`, `settings`, `runs`).
  - `SUPABASE_SERVICE_ROLE_KEY` hanya boleh ada di Edge Function (`supabase/functions/`), **dilarang keras** masuk ke `web/`, log, atau git.
  - Edge Function `collect` wajib memvalidasi header `x-cron-secret`.
  - Nama secret custom tidak boleh diawali `SUPABASE_`.
- **Batas CPU Edge Function (Maks 2 detik CPU / request)**:
  - Ukuran batch default `claim_companies(8)`.
  - Potong deskripsi maksimal 4.000 karakter sebelum dianalisis/disimpan.
  - Gunakan pencocokan substring lowercase (hindari regex dengan backtracking berat).
  - Jangan `JSON.parse` respons raksasa sekaligus; Greenhouse diambil tanpa `?content=true` pada batch rutin.
- **Etika Scraping**:
  - Hanya ambil dari API publik/JSON resmi ATS (Greenhouse, Lever, Ashby, dll.) atau feed yang mengizinkan.
  - Dilarang scrape Google, LinkedIn, Indeed, Jobstreet, Glints, atau halaman di balik login/CAPTCHA.
  - Selalu pasang `AbortSignal` dengan timeout (10 detik), `User-Agent` jelas, dan hormati `Retry-After`.
  - Kegagalan satu perusahaan tidak boleh menghentikan batch (`Promise.allSettled`, naikkan `fail_count`).
- **Idempotensi Notifikasi**:
  - Klaim notifikasi secara atomik (`update jobs set notified_at = now() where ... and notified_at is null returning *`) sebelum mengirim digest Telegram, dan rollback `notified_at = null` bila gagal kirim.
- **Bahasa & Gaya Kode**:
  - Kode, identifier, dan commit message (Conventional Commits) dalam bahasa Inggris.
  - Komentar menjelaskan *kenapa*, bukan *apa*.
