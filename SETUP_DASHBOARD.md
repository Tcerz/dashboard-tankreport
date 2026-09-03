# Setup Dashboard Admin (DIGISAFPAT)

## Fitur
1. Login admin.
2. Daftar seluruh user/petugas.
3. Tambah akun user baru (lewat Edge Function `create-user`).
4. **Edit nama & peran user**, **reset password** (admin set password baru — password lama tidak pernah bisa dilihat, hanya diganti), **hapus akun** (lewat Edge Function `manage-user`).
5. Aktifkan / nonaktifkan user.
6. Daftar laporan yang sudah diunggah dari mobile — klik satu baris untuk membuka **panel detail** (semua data kegiatan Loading/Discharge/Penyaluran/Storage + foto lampiran).
7. Tombol **"Tampilkan Laporan PDF"** — membuat dokumen PDF formal langsung di browser dan ditampilkan di panel yang sama, dengan tombol unduh.
8. Statistik: total laporan, user aktif, temuan "Tidak Aman" (total & per jenis kegiatan), persentase kegiatan aman, total foto, grafik laporan 7 hari & 6 bulan terakhir, tangki paling sering "Off", personel paling aktif, produk paling sering ditangani.
9. Auto-logout otomatis setelah 15 menit tidak aktif.

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
