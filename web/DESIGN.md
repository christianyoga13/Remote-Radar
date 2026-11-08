# DESIGN.md — Remote Radar Design System & Architecture Specification

> **System Name:** Obsidian Telemetry  
> **Brand & Philosophy:** Developer-First, High-Density, Supabase Free-Tier Observability & Job Ingestion Engine  
> **Primary Color Accent:** Cyan (`#06b6d4`)  
> **Interface Mode:** Pure Dark (`#0a0e17` Canvas / `#0f131c` Surface)  
> **Target Audience:** Single Developer / Power User (Indonesia/WIB UTC+7)  
> **Version:** 1.0.0 (Production Blueprint)

---

## 1. Design Philosophy & Guiding Principles

Remote Radar dibangun sebagai **personal observability cockpit** untuk memantau lowongan developer remote global langsung dari endpoint ATS (Greenhouse, Lever, Ashby) yang dijalankan seluruhnya di atas infrastruktur serverless Supabase Free Tier.

### Core Tenets:
1. **High Information Density with Zero Clutter:** Memaksimalkan data yang terlihat dalam satu layar tanpa scroll berlebihan. Menggunakan padding rapat, pemisah garis 1px halus, dan visual hierarchy yang tegas.
2. **Telemetry & System Status Transparency:** Seluruh status cron (`pg_cron`), kapasitas kuota CPU/Invocations, dan health ping adapter ditampilkan secara real-time di antarmuka.
3. **Keyboard-First Ergonomics:** Terinspirasi oleh antarmuka developer profesional (Vim, GitHub CLI, Linear). Navigasi tanpa mouse menggunakan pintasan keyboard (`J/K`, `⌘K`, `S`, `A`, `Ctrl+S`).
4. **Semantic Color Integrity:** Warna tidak bersifat dekoratif semata; setiap warna mewakili kondisi telemetri atau kelayakan lokasi geografis.
5. **Zero Latency & Predictable Spatial Layout:** Pola toolbar, tombol aksi pemicu batch (`Trigger Batch Run`), dan panel inspeksi terstandarisasi di seluruh 4 halaman utama.

---

## 2. Foundations & Design Tokens

### 2.1 Color Palette (Dark Developer / Obsidian Telemetry)

```
[ Canvas: #0a0e17 ] ---> [ Surface: #0f131c ] ---> [ Card/Panel: #181b25 ] ---> [ Hover: #1e222f ]
```

#### Neutral Surfaces & Structural Backgrounds
| Token | Hex | Tailwind Utility | Peruntukan & Deskripsi |
|---|---|---|---|
| `surface-lowest` | `#0a0e17` | `bg-[#0a0e17]` | Canvas latar belakang terdalam aplikasi |
| `surface` / `surface-dim` | `#0f131c` | `bg-[#0f131c]` | Latar belakang modul utama, persistent sidebar |
| `surface-container-low` | `#181b25` | `bg-[#181b25]` | Background card metrik, panel inspeksi, toolbar |
| `surface-container` | `#1e222f` | `bg-[#1e222f]` | Card hover state, nested code blocks, container aktif |
| `surface-container-high` | `#282d3c` | `bg-[#282d3c]` | Segmented pills aktif, border dividers, badge backdrop |
| `border-subtle` | `#1e293b` | `border-slate-800` | Border standar pemisah 1px (opacity 60-80%) |
| `border-focus` | `#06b6d4` | `border-cyan-500` | Focus ring input dan active drawer border |

#### Brand & Action Accents
| Token | Hex | Tailwind Utility | Peruntukan & Deskripsi |
|---|---|---|---|
| `primary` | `#06b6d4` | `bg-cyan-500` / `text-cyan-400` | **Obsidian Cyan**: Tombol primer, active nav highlight, glow border |
| `primary-hover` | `#0891b2` | `hover:bg-cyan-600` | Hover state tombol primer |
| `primary-glow` | `rgba(6,182,212,0.35)` | `shadow-[0_0_12px_rgba(6,182,212,0.35)]` | Glow neon pada tombol primer dan active indicator |
| `primary-muted` | `rgba(6,182,212,0.1)` | `bg-cyan-500/10` | Background highlight baris tabel terpilih / active sidebar tab |

#### Telemetry & Status Semantics
| Token | Hex | Tailwind Utility | Arti & Peruntukan |
|---|---|---|---|
| `status-emerald` | `#10b981` | `text-emerald-400` / `bg-emerald-950/40` | **Healthy / Eligible**: Lolos kriteria Indonesia, cron aktif, HTTP 200 OK |
| `status-amber` | `#f59e0b` | `text-amber-400` / `bg-amber-950/40` | **Warning / Unknown**: Lokasi ambigu, rate limit backoff (429), retrying |
| `status-rose` | `#f43f5e` | `text-rose-400` / `bg-rose-950/40` | **Restricted / Drop**: Blacklist US/EU only, CPU threshold tripped, HTTP 404/500 |
| `status-sky` | `#38bdf8` | `text-sky-400` / `bg-sky-950/40` | **Info / Dispatching**: Notifikasi sedang dikirim via webhook Telegram |

#### Typography & Content Colors
| Token | Hex | Tailwind Utility | Peruntukan & Rasio Kontras |
|---|---|---|---|
| `text-primary` | `#f1f5f9` | `text-slate-100` | Headline, judul lowongan, nilai metrik telemetri (WCAG AAA) |
| `text-secondary` | `#94a3b8` | `text-slate-400` | Subtitle, label kolom tabel, timestamp, slug perusahaan |
| `text-tertiary` | `#64748b` | `text-slate-500` | Monospace code snippet, hint keyboard shortcut, caption |
| `text-muted` | `#475569` | `text-slate-600` | Border disabled, inactive icons, divider dots |

---

### 2.2 Typography Scale & Hierarchy

Sistem tipografi menggunakan kombinasi sans-serif geometris modern untuk teks umum dan monospace murni untuk data teknis.

- **Primary Interface Font**: `Geist`, `Inter`, atau `system-ui, -apple-system, sans-serif`.
- **Monospace Telemetry Font**: `Geist Mono`, `SF Mono`, `Fira Code`, `Courier New`.

| Tingkat | Ukuran (Font Size / Line Height) | Weight | Font Family | Contoh Penggunaan |
|---|---|---|---|---|
| **KPI Hero Metric** | `32px` (`text-3xl` / 1.1) | Bold (700) | `Geist Mono` | Nilai kuota (`142,480 / 500k`), latency (`412ms`) |
| **H1 Screen Title** | `20px` (`text-xl` / 1.25) | Bold (700) | `Geist` | Judul halaman (`Run Logs & Edge Function Health`) |
| **H2 Section Header** | `15px` (`text-sm` s/d `text-base`) | SemiBold (600) | `Geist` | Subseksi (`Location Eligibility Classifier`) |
| **Card / Job Title** | `14px` (`text-sm` / 1.4) | Medium (500) | `Geist` | Judul lowongan (`Senior Go Backend Engineer`) |
| **Table Body & Cell** | `13px` (`text-[13px]` / 1.4) | Regular (400) | `Geist` | Baris data perusahaan, keterangan lokasi |
| **Monospace Telemetry** | `12px` (`text-xs` / 1.4) | Medium (500) | `Geist Mono` | Hash ID (`run_984f1a`), cron pattern (`*/15 * * * *`) |
| **Badges & Shortcuts** | `11px` (`text-[11px]` / 1.3) | SemiBold (600) | `Geist Mono` | Badge `⌘K`, tag `P0 (+30%)`, status `200 OK` |

---

### 2.3 Spacing, Borders & Radius Scale

- **Grid Base**: Kelipatan 4px (`0.25rem`).
- **Standard Border Width**: `1px` (`border`, `border-b`, `border-r`).
- **Corner Radii**:
  - `rounded-sm` (`2px`): Badge monospace, shortcut keys.
  - `rounded-md` (`6px`): Tombol aksi, input field, search box, table rows.
  - `rounded-lg` (`8px`): Card metrik, inspector panels, toolbar containers.
  - `rounded-full`: Status pulsing dots, pill badges.

---

## 3. Global Layout Architecture (`AppShell`)

Aplikasi terdiri dari struktur 2-kolom tetap (*Fixed 2-Column Shell*):

```
+--------------------------------------------------------------------------------------------------+
| Top Navigation Bar (Fixed 52px)                                                                 |
| [Status Badges: Cron Active | 3 ATS Live | WIB Filter ON]       [Quick Find ⌘K] [Refresh] [Admin] |
+------------------------------------+-------------------------------------------------------------+
| Persistent Left Sidebar (256px)    | Main Application Viewport (Scrollable Content Area)         |
| - Brand Monogram & Version Pill    |                                                             |
| - Navigation Menu:                 |                                                             |
|   * Live Job Feed (/)              |                                                             |
|   * Monitored Companies (/companies|                                                            |
|   * Run Logs (/runs)               |                                                             |
|   * Settings (/settings)           |                                                             |
|                                    |                                                             |
| - Bottom Telemetry Health Strip    |                                                             |
|   (Greenhouse 42ms | Ashby 110ms)  |                                                             |
+------------------------------------+-------------------------------------------------------------+
```

### 3.1 Persistent Left Sidebar (`<AppSidebar>`)
- **Width**: `w-64` (256px) dengan `border-r border-slate-800/80 bg-[#0f131c]`.
- **Brand Header**:
  - Logo Icon / Terminal Radar monokrom + teks `Remote Radar`.
  - Version Badge: `v0.2 Supabase` dalam font monospace `text-[10px] text-cyan-400 bg-cyan-950/40 border border-cyan-800/50`.
- **Navigation Links**:
  - `Live Feed` (`/`) — Icon: `Radio`
  - `Companies` (`/companies`) — Icon: `Building-2`
  - `Run Logs` (`/runs`) — Icon: `Terminal`
  - `Settings` (`/settings`) — Icon: `Sliders`
- **Active Nav State**:
  - Background: `bg-cyan-500/10`
  - Text: `text-cyan-400 font-medium`
  - Left Indicator: `border-l-2 border-cyan-400`
- **Bottom Telemetry Widget**:
  - Menampilkan ping round-trip terakhir ke ATS public endpoints:
    - Greenhouse: `42ms` (Dot hijau)
    - Ashby: `110ms` (Dot ungu)
    - Lever: `68ms` (Dot biru)

### 3.2 Top Telemetry Header (`<TopHeader>`)
- **Height**: `h-13` (52px) dengan `border-b border-slate-800/80 bg-[#0f131c]/90 backdrop-blur-md`.
- **Status Cluster (Kiri)**:
  - `pg_cron: Active · 12m ago` (Pill dengan green pulse dot).
  - `3 ATS Adapters Live` (Network mesh icon).
  - `Indonesia/WIB Filter: ON` (Shield check icon).
- **Utility Cluster (Kanan)**:
  - Command Bar input (`Quick Find ⌘K`).
  - Refresh icon button.
  - User Identity Pill (`Christian Admin` + avatar ring).

---

## 4. Standardized Component Library

### 4.1 Primary Action Button (`<PrimaryBatchButton>`)
*Telah distandarisasi di seluruh 4 halaman untuk memicu worker Supabase via pg_net.*

```html
<button class="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-md shadow-[0_0_12px_rgba(6,182,212,0.35)] transition-all active:scale-[0.98]">
  <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
  </svg>
  <span>Trigger Batch Run</span>
</button>
```

- **Perilaku**: Memicu Edge Function asynchronous dengan klaim `SELECT FOR UPDATE SKIP LOCKED`.
- **Variasi Sekunder**: Tombol outline `border border-slate-700 hover:border-slate-500 text-slate-300 bg-slate-900/60`.

---

### 4.2 Standard Search & Filter Toolbar (`<SearchFilterToolbar>`)
*Pola spasial yang seragam: [Search] -> [Status Segmented Pills] -> [ATS Filter] -> [Action/Export].*

```
+--------------------------------------------------------------------------------------------------+
| [ 🔍 Filter by keywords, slug, or ID...  ⌘K ]  [ All (96) | Succeeded (95) | Degraded (1) ]  [ ATS: All ▾ ]  [ 📥 Export ] |
+--------------------------------------------------------------------------------------------------+
```

1. **Search Input (`<SearchInput>`)**:
   - Container `bg-[#121622] border border-slate-800 focus-within:border-cyan-500 rounded-md`.
   - Ikon Search 14px di sisi kiri + badge keyboard hint `⌘K` atau `/` di sisi kanan.
2. **Segmented Filter Pills (`<SegmentedPills>`)**:
   - Container horizontal `bg-slate-900/80 p-0.5 rounded-md border border-slate-800`.
   - Item aktif: `bg-slate-800 text-slate-100 font-medium shadow-sm`.
   - Item inaktif: `text-slate-400 hover:text-slate-200`.
   - Dot indikator status berbasis warna (Emerald untuk aktif/sukses, Amber untuk warning, Rose untuk gagal).
3. **Dropdown Adapter Select (`<ATSAdapterSelect>`)**:
   - Menampilkan opsi: `All Adapters`, `Greenhouse`, `Lever`, `Ashby`.

---

### 4.3 Telemetry KPI Card (`<TelemetryStatCard>`)
Digunakan pada `/runs` dan overview `/companies` untuk memantau batasan ketat Supabase Free Tier.

- **Struktur**:
  - `Header`: Judul kecil huruf kapital monospace (`SUPABASE FREE QUOTA`, `CPU BUDGET`).
  - `Metric Value`: Angka besar tebal (`142,480 / 500k`, `412ms / 2,000ms max`).
  - `Status Pill`: Pojok kanan atas (`Rp0 / FREE TIER`, `ACTIVE`, `HEALTHY`).
  - `Sub-metric Progress Bar`: Bar indikator tipis dengan persentase (`28.5% Invocations used Safe Margin`).

---

### 4.4 High-Density Data Grid (`<DataTable>`)
Digunakan untuk tabel daftar perusahaan (`/companies`) dan riwayat batch execution (`/runs`).

- **Header**: Monospace uppercase `text-[11px] font-semibold text-slate-400 tracking-wider bg-slate-900/60 border-b border-slate-800`.
- **Row Styling**: Alternating background tipis `hover:bg-slate-800/40 cursor-pointer transition-colors`.
- **Status & Adapter Badges**:
  - `Greenhouse`: `border-emerald-500/30 text-emerald-400 bg-emerald-950/20`
  - `Lever`: `border-blue-500/30 text-blue-400 bg-blue-950/20`
  - `Ashby`: `border-purple-500/30 text-purple-400 bg-purple-950/20`
  - `Eligible (ID/WIB)`: Badge hijau neon `bg-emerald-500/10 text-emerald-400 border border-emerald-500/30`
  - `Restricted`: Badge merah `bg-rose-500/10 text-rose-400 border border-rose-500/30`

---

### 4.5 Detail Inspector Panel (`<InspectorPanel>`)
Pola inspeksi detail untuk memeriksa payload AST lowongan atau stdout log eksekusi Deno runtime.

- **Header Bar**: Menampilkan identifier unik (`run_984f1a` atau `job_8829`), exit code (`200 OK`), dan durasi eksekusi (`14.2s`).
- **Dual-Pane Layout**:
  - **Left Breakdown Pane**: Analisis waktu per worker atau vektor kecocokan stack (+30% Go, +15% Postgres).
  - **Right Console Stream**: Area log monospace gelap dengan warna level (`[INIT]` abu-abu, `[NET]` cyan, `[PARSER]` ungu, `[TELEGRAM]` hijau).

---

## 5. Screen Architectural Blueprints

### 5.1 Screen 1: Live Job Feed (`/`)
- **Tujuan**: Pemindaian cepat dan penandaan lowongan kerja remote yang lolos kriteria Indonesia/WIB.
- **Layout**: 2-Column Split View.
  - **Kolom Kiri**: Daftar kartu lowongan dengan skor match persentase, pill badge adapter ATS, lokasi terdeteksi, dan tombol cepat `Save (S)` / `Apply (A)`.
  - **Kolom Kanan**: Persistent AST Inspector yang menampilkan deskripsi utuh, breakdown kualifikasi kata kunci, dan link langsung ke career page ATS.

### 5.2 Screen 2: Monitored Companies (`/companies`)
- **Tujuan**: Manajemen daftar perusahaan yang dipantau (seed list U3) beserta statistik performa endpoint ATS.
- **Layout**: Full-width High Density Grid.
  - Quick Add Bar di bagian atas (Nama Perusahaan + Slug ATS + Tombol Add).
  - Tabel interaktif dengan indikator status sinkronisasi, fail counter, dan waktu cek terakhir.
  - Benchmarks widget di sisi kanan.

### 5.3 Screen 3: Settings & Keyword Rules (`/settings`)
- **Tujuan**: Konfigurasi classifier regex, kata kunci lokasi, stack scoring, dan webhook Telegram tanpa redeploy kode (F7 & U7).
- **Layout**: Multi-Card Config Studio.
  - Modul 1: Location Eligibility Classifier (`Eligible Tags` vs `Restricted Blacklist`).
  - Modul 2: Tech Stack Matcher & Seniority Weights (P0 Go/React/Flutter +30%, P1 DB/Cloud +15%).
  - Modul 3: Blacklist Roles & Syarat Circuit Breaker.
  - Modul 4: Telegram Dispatch Settings & Live Message Preview.
  - Modul 5: In-Memory AST Sandbox Tester untuk menguji string payload ATS secara instan.

### 5.4 Screen 4: Run Logs & Observability (`/runs`)
- **Tujuan**: Audit trail eksekusi batch pg_cron, CPU budget tracking, dan latensi jaringan pg_net.
- **Layout**: Observability Dashboard.
  - KPI Hero Metrics (Kuota 500k invocations, CPU Wall-clock vs 2.0s limit, Worker pool concurrency).
  - 24H Execution Latency Batang Chart.
  - Data Grid riwayat eksekusi batch `public.runs`.
  - Bottom Run Inspector Drawer dengan stdout console streaming Deno runtime.

---

## 6. Keyboard Navigation & Interaction Specifications

Sistem Remote Radar dirancang dengan prinsip **Keyboard-First Ergonomics**:

| Shortcut | Scope | Aksi & Respons Antarmuka |
|---|---|---|
| `⌘K` atau `/` | Global | Memfokuskan kursor ke input pencarian / Quick Find |
| `J` | Feed / Tables | Pindah seleksi ke baris/kartu berikutnya (bawah) |
| `K` | Feed / Tables | Pindah seleksi ke baris/kartu sebelumnya (atas) |
| `S` | Job Feed (`/`) | Toggle simpan lowongan (*Bookmark/Save*) |
| `A` | Job Feed (`/`) | Tandai lowongan sebagai sudah dilamar (*Applied*) |
| `Enter` atau `Space` | Tables / Cards | Membuka drawer detail inspector |
| `Ctrl+S` atau `⌘S` | Settings (`/settings`) | Menyimpan & sinkronisasi konfigurasi JSONB ke Supabase |
| `Esc` | Modal / Drawer | Menutup panel inspector aktif / unfocus search |

---

## 7. Supabase Free Tier Constraints & Implementation Guide

Semua komponen dan alur kerja UI dirancang untuk beroperasi di bawah batasan **Supabase Free Tier (Rp0 / Bulan)**:

1. **Edge Function CPU Limit (2.0s)**:
   - UI membagi pemicuan per batch kecil (maksimal 8 perusahaan per batch).
   - Pengambilan dilakukan bergilir menggunakan klaim konkurensi Postgres `SELECT ... FOR UPDATE SKIP LOCKED`.
2. **Invocations Budget (500,000 / bulan)**:
   - Interval cron diset pada `*/15 * * * *` (96 runs/hari) = ~2,880 invocations/bulan (sangat hemat, hanya ~0.57% dari kuota).
3. **Database Security & RLS**:
   - Frontend static hanya berkomunikasi via Supabase JS Client menggunakan `anon_key` publik yang dibatasi oleh Row Level Security (RLS). Secret Telegram dan kunci `service_role` disimpan secara eksklusif di Supabase Vault / Edge Function Secrets.

---
*Dokumen ini merupakan spesifikasi desain resmi untuk sistem antarmuka Remote Radar.*
