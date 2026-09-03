# Setup Dashboard Admin (Tank Report)

## Fitur
1. Login admin.
2. Daftar seluruh user/petugas.
3. Tambah akun user baru (lewat Edge Function, aman — tidak expose service_role key ke browser).
4. Aktifkan / nonaktifkan user.
5. Daftar laporan yang sudah diunggah dari mobile.
6. Statistik ringkas (total laporan, user aktif, grafik laporan 7 hari terakhir).

## Prasyarat
Backend Supabase yang sama dengan aplikasi mobile (skema `supabase/schema.sql` di paket mobile sudah dijalankan, dan minimal satu akun admin sudah ada di tabel `profiles`).

## Langkah setup

1. `cp .env.example .env`, lalu isi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` (Project Settings > API).
2. Install dependency:
   ```
   npm install
   ```
3. **Deploy Edge Function** `create-user` (butuh Supabase CLI):
   ```
   npx supabase login
   npx supabase link --project-ref <project-ref-anda>
   npx supabase functions deploy create-user
   ```
   Tanpa langkah ini, tombol "Tambah User" di dashboard tidak akan berfungsi.
4. Jalankan mode development:
   ```
   npm run dev
   ```
5. Untuk build produksi:
   ```
   npm run build
   ```
   Hasilnya ada di folder `dist/` — siap di-deploy ke hosting statis (langkah deploy menyusul di percakapan berikutnya).

## Catatan keamanan
`service_role key` Supabase **tidak pernah** ditaruh di kode dashboard (frontend). Kunci itu hanya dipakai di dalam Edge Function `create-user`, yang berjalan di server Supabase, bukan di browser.
