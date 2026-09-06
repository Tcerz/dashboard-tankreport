-- MIGRASI 04: Perketat visibilitas antar-role
-- Jalankan di SQL Editor Supabase, setelah migration_03.
-- Tujuan: admin HANYA bisa melihat/mengelola akun petugas (role='user') di
-- depotnya sendiri -- tidak bisa melihat admin lain ataupun superadmin,
-- termasuk sesama admin di depot yang sama.

drop policy if exists "lihat profil" on profiles;
create policy "lihat profil" on profiles for select using (
  auth.uid() = id                                            -- lihat profil sendiri
  or is_superadmin()                                          -- superadmin lihat semua
  or (is_admin() and role = 'user' and depot_id = my_depot()) -- admin cuma lihat petugas di depotnya
);

drop policy if exists "update profil" on profiles;
create policy "update profil" on profiles for update using (
  is_superadmin()
  or (is_admin() and role = 'user' and depot_id = my_depot())
);
