# PRD: Remote Radar

Sistem pribadi untuk memantau lowongan remote langsung dari sumber perusahaan (ATS / career page), bukan dari job portal, lalu kirim notifikasi begitu ada lowongan baru yang cocok.

Status: Draft v0.2 (Supabase-only) · Pemilik: Christian · Pengguna: 1 orang (personal tool)

**Prinsip platform:** tidak ada backend sendiri. Semua logika berjalan di Supabase (Postgres, pg_cron, Edge Functions, Auth). Frontend, bila ada, hanya static app yang membaca Supabase.

---

## 1. Latar belakang

Hasil pencarian Google untuk "remote developer" didominasi job portal (LinkedIn, Indeed, Jobstreet, Glints). Lowongan di portal biasanya salinan dari halaman career perusahaan, telat muncul, dan sudah ramai dilamar. Banyak lowongan "remote" ternyata hanya untuk US/EU tanpa visa support, sehingga waktu terbuang.

Kebanyakan startup memakai ATS (Greenhouse, Lever, Ashby, dll.) yang punya endpoint JSON publik. Data dari sana lebih cepat, lebih lengkap, dan bisa diambil tanpa login.

## 2. Tujuan

1. Dapat notifikasi lowongan baru dalam hitungan jam sejak dipublikasikan perusahaan.
2. Hanya lowongan yang relevan dengan profil (role, stack) dan **bisa dilamar dari Indonesia**.
3. Seluruh sistem berjalan di free tier, tanpa server sendiri dan tanpa biaya bulanan.
4. Mudah ditambah sumber baru (satu adapter per ATS).

### Non-goals
- Bukan job portal publik, tidak ada multi-user di MVP.
- Tidak auto-apply.
- Tidak scrape Google, LinkedIn, atau halaman yang butuh login.
- Tidak ada server/backend sendiri di luar Supabase.

## 3. Pengguna & kasus penggunaan

Pengguna tunggal: developer fullstack/frontend/backend (Go, React/Next.js, Flutter) yang mencari kerja remote worldwide.

| ID | Sebagai pengguna, saya ingin... | Agar... |
|----|---------------------------------|---------|
| U1 | menerima pesan Telegram saat ada lowongan baru yang cocok | bisa apply di 24-48 jam pertama |
| U2 | lowongan "US only / EU only" otomatis tersaring | tidak membuang waktu |
| U3 | menambah perusahaan baru dengan satu baris (nama + ATS + slug) | daftar pantauan terus tumbuh |
| U4 | melihat daftar lowongan terbaru + filter di web | bisa scan cepat dan tandai status |
| U5 | menandai lowongan (disimpan, dilamar, diabaikan) | tidak melihat ulang yang sama |
| U6 | tahu kalau perusahaan/sumber gagal di-fetch | tahu kalau pemantauan tidak jalan |
| U7 | mengubah kata kunci dan aturan lokasi tanpa deploy ulang | tuning cepat |

## 4. Fitur & prioritas

### MVP (P0): tanpa frontend
- Adapter ATS: **Greenhouse, Lever, Ashby** (Edge Function).
- Daftar perusahaan di tabel `companies`, diisi lewat SQL/CSV import di Supabase Dashboard.
- Pengambilan bergilir per batch kecil, dipicu **pg_cron**.
- Filter: kata kunci role/stack, remote, klasifikasi kelayakan lokasi (aturan di tabel `settings`).
- Dedup lowongan (tidak notifikasi dua kali) dan deteksi lowongan yang sudah ditutup.
- Notifikasi Telegram (digest).
- Log tiap batch di tabel `runs`.

### V1 (P1)
- Dashboard web static (Next.js/Vite) di hosting gratis, membaca Supabase lewat anon key + login (Supabase Auth) + RLS.
- Edge Function `discover` mingguan: ekstrak slug ATS dari feed agregator gratis, thread HN "Who is hiring", dan repositori GitHub `remoteintech/remote-jobs` (profil perusahaan worldwide & remote-first).
- Deteksi zona waktu & budaya asynchronous (`is_async`, `timezone_note`) untuk kompatibilitas zona WIB/UTC+7.
- Adapter tambahan: Workable, SmartRecruiters, Recruitee, dan Custom HTML.
- Skor kecocokan dan pengurutan (termasuk bonus perusahaan remote global dan async).
- Tombol/perintah Telegram untuk menandai lowongan (via Edge Function webhook).

### V2 (P2)
- Scrape halaman career custom (HTML) untuk perusahaan pilihan, aturan per domain.
- Pelacak status lamaran (applied, interview, offer).

## 5. Kebutuhan fungsional

- F1. Setiap perusahaan aktif di-fetch minimal beberapa kali sehari (target tiap 3-6 jam). Karena batas runtime Edge Function, fetch dibagi per batch dan bergilir (lihat ARCHITECTURE.md).
- F2. Lowongan unik berdasarkan `(company_id, external_id)`.
- F3. Lowongan baru = belum pernah ada di DB. Lowongan yang hilang dari hasil fetch ditandai `closed_at`.
- F4. Klasifikasi lokasi: `eligible`, `restricted`, atau `unknown`.
  - `eligible`: menyebut worldwide, anywhere, global, APAC, Asia, Southeast Asia, Indonesia.
  - `restricted`: US-only, EU-only, UK-only, "must reside in", "work authorization", "no visa sponsorship", atau kantor kota tertentu tanpa kata remote.
  - `unknown`: sisanya (tetap tampil, diberi tanda).
- F5. Notifikasi hanya untuk lowongan: remote, lokasi bukan `restricted`, lolos kata kunci, dan belum pernah dinotifikasi.
- F6. Kegagalan satu perusahaan tidak menghentikan batch. Perusahaan yang gagal berulang dinonaktifkan otomatis.
- F7. Kata kunci, blacklist, ambang skor, dan daftar kata lokasi disimpan di tabel `settings` (JSON), bisa diubah tanpa deploy.
- F8. Dua batch yang tumpang tindih tidak boleh memproses perusahaan yang sama (klaim batch dengan `skip locked`).

## 6. Kebutuhan non-fungsional

- **Biaya:** Rp0, hanya free tier (lihat ARCHITECTURE.md).
- **Batas Edge Function:** CPU time per request 2 detik (I/O async tidak dihitung) dan wall-clock 150 detik di plan Free. Batch kecil dan parsing hemat adalah syarat desain.
- **Etika scraping:** pakai API publik dulu, jeda antar request, User-Agent jelas, patuhi `robots.txt` untuk HTML.
- **Idempotensi:** memproses batch dua kali tidak menghasilkan notifikasi ganda.
- **Keamanan:** RLS aktif di semua tabel; service role key tidak pernah ke frontend; secret di Supabase Vault / Edge Function secrets.
- **Observability:** ringkasan tiap batch ke `runs`, error per perusahaan ke `companies.last_status`.

## 7. Metrik keberhasilan

| Metrik | Target |
|--------|--------|
| Jeda lowongan terbit sampai notifikasi | < 6 jam (median) |
| Notifikasi yang ternyata tidak eligible dari Indonesia | < 20% |
| Perusahaan yang dipantau | >= 200 dalam 1 bulan |
| Biaya bulanan | Rp0 |
| Batch gagal total (semua perusahaan error) | < 1% |

## 8. Risiko & mitigasi

| Risiko | Mitigasi |
|--------|----------|
| Edge Function kena batas CPU 2 detik | Batch kecil (mis. 8 perusahaan), jangan parse deskripsi panjang, potong teks, tanpa regex berat |
| Project Supabase free di-pause bila lama tidak aktif | Cron rutin dan akses dashboard; cek kebijakan terbaru; ada opsi ping manual |
| `pg_net` gagal diam-diam | Cek `net._http_response` berkala; tulis hasil batch ke `runs` dan beri peringatan di digest bila tidak ada run baru |
| Slug salah / perusahaan pindah ATS | `fail_count` + nonaktif otomatis, dilaporkan di digest |
| Endpoint ATS berubah | Adapter terisolasi + test fixture |
| Klasifikasi lokasi meleset | Aturan di `settings`, tampilkan `unknown` apa adanya, tuning dari false positive |
| Syarat penggunaan feed pihak ketiga | Baca ToS/atribusi; jadikan sumber discovery opsional |

## 9. Rencana rilis

1. **Minggu 1:** skema DB + RLS, Edge Function `collect` (Greenhouse/Lever/Ashby), cron, Telegram, 30-50 perusahaan seed.
2. **Minggu 2:** filter lokasi + skor, tabel `settings`, laporan `runs`, tuning.
3. **Minggu 3-4:** dashboard static + Auth, `discover`, adapter tambahan.

## 10. Pertanyaan terbuka

- Notifikasi digest sekali sehari atau tiap ada lowongan baru?
- Dashboard di-host di mana (Cloudflare Pages / Vercel / GitHub Pages)?
- Perlu dukungan kontrak per jam, atau hanya full-time?
