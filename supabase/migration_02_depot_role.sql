-- MIGRASI 02: Multi-Depot & Role Superadmin
-- Jalankan di SQL Editor Supabase. Aman dijalankan di project yang SUDAH ADA
-- datanya (tidak menghapus tabel/data lama, hanya menambah).

-- 1. Tabel depot (lokasi kerja)
create table depots (
  id uuid primary key default gen_random_uuid(),
  nama text not null unique,
  created_at timestamptz not null default now()
);
alter table depots enable row level security;

create policy "semua user login boleh baca daftar depot" on depots
  for select using (auth.role() = 'authenticated');

-- 2. Tambah kolom depot_id ke profiles, dan perluas pilihan role
alter table profiles add column depot_id uuid references depots(id);
alter table profiles drop constraint profiles_role_check;
alter table profiles add constraint profiles_role_check
  check (role in ('user', 'admin', 'superadmin'));

-- 3. Tambah kolom depot_id ke reports (diisi OTOMATIS lewat trigger di bawah,
--    jadi aplikasi mobile TIDAK PERLU diubah sama sekali)
alter table reports add column depot_id uuid references depots(id);

create or replace function set_report_depot() returns trigger as $$
begin
  if new.depot_id is null then
    select depot_id into new.depot_id from profiles where id = new.user_id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_set_report_depot
  before insert on reports
  for each row execute function set_report_depot();

-- 4. Perbarui fungsi helper: is_admin() sekarang KHUSUS role 'admin' saja
--    (bukan lagi termasuk superadmin, supaya bisa dibedakan hak aksesnya)
create or replace function is_admin() returns boolean as $$
  select role = 'admin' from profiles where id = auth.uid();
$$ language sql security definer;

create or replace function is_superadmin() returns boolean as $$
  select role = 'superadmin' from profiles where id = auth.uid();
$$ language sql security definer;

create or replace function my_depot() returns uuid as $$
  select depot_id from profiles where id = auth.uid();
$$ language sql security definer;

-- 5. Ganti ulang RLS profiles: admin cuma lihat/kelola depotnya sendiri,
--    superadmin lihat/kelola semua.
drop policy if exists "user lihat profil sendiri" on profiles;
drop policy if exists "admin kelola semua profil" on profiles;
drop policy if exists "admin update semua profil" on profiles;

create policy "lihat profil" on profiles for select using (
  auth.uid() = id
  or is_superadmin()
  or (is_admin() and depot_id = my_depot())
);
create policy "buat profil baru" on profiles for insert with check (
  is_superadmin() or is_admin()
);
create policy "update profil" on profiles for update using (
  is_superadmin() or (is_admin() and depot_id = my_depot())
);

-- 6. Ganti ulang RLS reports: admin lihat laporan depotnya, superadmin semua.
drop policy if exists "user lihat laporan sendiri atau admin lihat semua" on reports;
create policy "lihat laporan" on reports for select using (
  auth.uid() = user_id
  or is_superadmin()
  or (is_admin() and depot_id = my_depot())
);

-- 7. Ganti ulang RLS report_photos mengikuti aturan laporan induknya.
drop policy if exists "user lihat foto laporan sendiri atau admin" on report_photos;
create policy "lihat foto laporan" on report_photos for select using (
  exists (
    select 1 from reports r
    where r.id = report_id
      and (r.user_id = auth.uid() or is_superadmin() or (is_admin() and r.depot_id = my_depot()))
  )
);

-- 8. Superadmin boleh menambah depot baru dari dashboard.
create policy "superadmin kelola depot" on depots for insert with check (is_superadmin());
create policy "superadmin update depot" on depots for update using (is_superadmin());

-- SELESAI. Langkah lanjutan (WAJIB dilakukan manual satu kali):
-- a) Tambahkan minimal 1 baris di tabel `depots` (Table Editor atau SQL) untuk
--    setiap lokasi depot yang ada, contoh: insert into depots (nama) values ('Depot Siak');
-- b) Jadikan akun admin Anda yang sudah ada sebagai 'superadmin':
--    update profiles set role = 'superadmin' where email = 'email_admin_anda';
