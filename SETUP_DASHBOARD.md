# Setup Dashboard Admin (DIGISAFPAT)

## Fitur
1. Login admin/superadmin.
2. **3 tingkat role**: Superadmin (lihat semua depot, bisa filter tampilan per depot lewat dropdown), Admin (terkunci ke 1 depot), Petugas (upload dari mobile, laporan otomatis tertaut ke depotnya).
3. Daftar user — superadmin lihat semua, admin cuma lihat user di depotnya sendiri (otomatis lewat aturan keamanan database).
4. Tambah akun: superadmin bisa buat admin/petugas untuk depot manapun; admin biasa cuma bisa buat petugas untuk depotnya sendiri.
5. Edit nama/peran/depot, reset password, hapus akun — semua dibatasi sesuai depot untuk admin biasa.
6. **Kelola daftar depot** (khusus superadmin) — tambah depot baru langsung dari halaman Users, tanpa perlu edit SQL.
7. Aktifkan / nonaktifkan user.
8. Daftar laporan (dengan dropdown filter depot untuk superadmin) — klik baris untuk detail + foto + **PDF formal** via side panel.
9. Statistik lengkap (juga bisa difilter per depot): total laporan, user aktif, temuan tidak aman (total & per jenis kegiatan), tangki sering "Off", personel teraktif, produk teratas, tren 7 hari & 6 bulan.
10. Auto-logout 15 menit tidak aktif.

## Prasyarat backend
Jalankan **berurutan** di SQL Editor Supabase:
1. `supabase/schema.sql` (kalau project baru / belum pernah dijalankan sama sekali)
2. `supabase/migration_02_depot_role.sql` (menambahkan sistem depot & superadmin — aman dijalankan walau sudah ada data)

Setelah migrasi, **wajib** dilakukan manual sekali (lihat komentar di akhir file migrasi):
- Tambahkan minimal 1 baris di tabel `depots` untuk tiap lokasi (mis. "Depot Siak", "Depot Medan", dst).
- Jadikan akun Anda sebagai `superadmin` lewat Table Editor atau SQL:
  ```sql
  update profiles set role = 'superadmin' where email = 'email_anda@contoh.com';
  ```

## Prasyarat
Backend Supabase yang sama dengan aplikasi mobile (skema `supabase/schema.sql` di paket mobile sudah dijalankan, dan minimal satu akun admin sudah ada di tabel `profiles`).

## Langkah setup

1. `cp .env.example .env`, lalu isi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` (Project Settings > API).
2. Install dependency:
   ```
   npm install
   ```
3. **Deploy Edge Functions** (butuh Supabase CLI):
   ```
   npx supabase login
   npx supabase link --project-ref <project-ref-anda>
   npx supabase functions deploy create-user
   npx supabase functions deploy manage-user
   ```
   Tanpa langkah ini, tombol "Tambah User", "Reset Password", dan "Hapus" di dashboard tidak akan berfungsi.
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
