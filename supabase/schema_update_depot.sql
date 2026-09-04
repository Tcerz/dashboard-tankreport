-- Jalankan file ini SETELAH schema.sql (yang lama) sudah pernah dijalankan.
-- Aman dijalankan sekali di SQL Editor Supabase.

-- 1. Tabel depot (dikelola superadmin lewat dashboard)
create table if not exists depots (
  id uuid primary key default gen_random_uuid(),
  nama text not null unique,
  created_at timestamptz not null default now()
);
alter table depots enable row level security;

-- 2. Tambah kolom depot_id ke profiles (nullable, karena superadmin tidak terikat 1 depot)
alter table profiles add column if not exists depot_id uuid references depots(id);

-- 3. Perluas pilihan role jadi termasuk superadmin
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check check (role in ('user','admin','superadmin'));

-- 4. Helper: cek peran & depot user yang sedang login
create or replace function my_role() returns text as $$
  select role from profiles where id = auth.uid();
$$ language sql security definer stable;

create or replace function my_depot() returns uuid as $$
  select depot_id from profiles where id = auth.uid();
$$ language sql security definer stable;

create or replace function is_superadmin() returns boolean as $$
  select my_role() = 'superadmin';
$$ language sql security definer stable;

create or replace function is_admin() returns boolean as $$
  select my_role() in ('admin', 'superadmin');
$$ language sql security definer stable;

-- 5. Bersihkan policy lama yang belum mengenal konsep depot
drop policy if exists "user lihat profil sendiri" on profiles;
drop policy if exists "admin kelola semua profil" on profiles;
drop policy if exists "admin update semua profil" on profiles;
drop policy if exists "user lihat laporan sendiri atau admin lihat semua" on reports;
drop policy if exists "user lihat foto laporan sendiri atau admin" on report_photos;

-- 6. Policy baru yang sadar depot:
--    - superadmin: lihat & kelola semua, semua depot
--    - admin: lihat & kelola hanya akun/laporan di depotnya sendiri (dan tidak bisa menyentuh superadmin)
--    - user (petugas): tetap hanya lihat data miliknya sendiri
create policy "lihat profil sesuai cakupan" on profiles for select using (
  auth.uid() = id or is_superadmin() or (my_role() = 'admin' and depot_id = my_depot())
);
create policy "update profil sesuai cakupan" on profiles for update using (
  is_superadmin() or (my_role() = 'admin' and depot_id = my_depot() and role <> 'superadmin')
) with check (
  is_superadmin() or (my_role() = 'admin' and depot_id = my_depot() and role <> 'superadmin')
);

create policy "lihat laporan sesuai cakupan" on reports for select using (
  auth.uid() = user_id
  or is_superadmin()
  or (my_role() = 'admin' and exists (
        select 1 from profiles p where p.id = reports.user_id and p.depot_id = my_depot()
      ))
);

create policy "lihat foto sesuai cakupan" on report_photos for select using (
  exists (
    select 1 from reports r
    where r.id = report_photos.report_id
      and (
        r.user_id = auth.uid()
        or is_superadmin()
        or (my_role() = 'admin' and exists (
              select 1 from profiles p where p.id = r.user_id and p.depot_id = my_depot()
            ))
      )
  )
);

-- 7. Semua user yang login boleh lihat daftar depot (untuk dropdown), hanya superadmin yang kelola
create policy "semua user login bisa lihat daftar depot" on depots for select using (auth.uid() is not null);
create policy "hanya superadmin tambah depot" on depots for insert with check (is_superadmin());
create policy "hanya superadmin hapus depot" on depots for delete using (is_superadmin());
