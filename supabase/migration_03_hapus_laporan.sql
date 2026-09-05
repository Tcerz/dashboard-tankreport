-- MIGRASI 03: Hapus Laporan (khusus superadmin)
-- Jalankan di SQL Editor Supabase, setelah migration_02_depot_role.sql.

-- Izinkan superadmin menghapus baris di tabel reports.
-- (report_photos ikut terhapus otomatis lewat ON DELETE CASCADE yang sudah ada)
create policy "superadmin hapus laporan" on reports for delete using (is_superadmin());

-- Izinkan superadmin menghapus file foto di storage bucket laporan-foto,
-- supaya file tidak tertinggal (orphan) saat laporannya dihapus.
create policy "superadmin hapus foto" on storage.objects for delete
  using (bucket_id = 'laporan-foto' and is_superadmin());
