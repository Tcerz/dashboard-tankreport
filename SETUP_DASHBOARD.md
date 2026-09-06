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
10. **Hapus laporan** (khusus superadmin) — di panel detail laporan, dengan verifikasi wajib mengetik ulang nama petugas pembuat laporan sebelum benar-benar terhapus. Foto lampiran di storage ikut dihapus.
11. Auto-logout 15 menit tidak aktif.
12. **CAPTCHA di halaman login** (Cloudflare Turnstile) — mencegah bot/script mencoba login berkali-kali (brute-force/spam login). Opsional: kalau belum dikonfigurasi, login tetap berfungsi normal tanpa captcha.

## Perbaikan bug: tampilan kacau / balik ke login saat refresh
Sebelumnya ada race condition: Vue Router sempat mengambil keputusan sebelum status login selesai dicek ke Supabase, dan logika auto-logout 15 menit salah membaca stempel waktu lama. Keduanya sudah diperbaiki di `src/main.js` (menunggu cek sesi selesai dulu sebelum aplikasi dimulai) dan `src/lib/auth.js` + `src/lib/activity.js` (urutan cek idle yang benar). Tidak ada langkah setup tambahan untuk perbaikan ini — otomatis berlaku setelah deploy ulang.

## Setup CAPTCHA (Cloudflare Turnstile)
1. Daftar gratis di https://dash.cloudflare.com, buka menu **Turnstile**, klik **Add Site**.
2. Isi domain Anda (mis. `digisafpat.vercel.app`), pilih mode **Managed** (paling seimbang antara keamanan & kenyamanan).
3. Catat **Site Key** dan **Secret Key** yang muncul.
4. Isi `VITE_TURNSTILE_SITE_KEY` di `.env` (lokal) dan di Environment Variables Vercel dengan Site Key tadi.
5. Di **Supabase Dashboard** → Authentication → Settings → **Bot and Abuse Protection** → aktifkan **Enable CAPTCHA protection**, pilih provider **Turnstile**, lalu isi **Secret Key** (yang ini, BUKAN Site Key) di situ.
6. Redeploy dashboard (push ke GitHub seperti biasa).

## Prasyarat backend
Jalankan **berurutan** di SQL Editor Supabase:
1. `supabase/schema.sql` (kalau project baru / belum pernah dijalankan sama sekali)
2. `supabase/migration_02_depot_role.sql` (sistem depot & superadmin)
3. `supabase/migration_03_hapus_laporan.sql` (izin hapus laporan untuk superadmin)
4. `supabase/migration_04_batasi_visibilitas.sql` (admin hanya bisa lihat/kelola petugas di depotnya, tidak bisa lihat admin lain/superadmin)

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
