-- =====================================================================
-- Referensi wilayah Kota Tarakan: kecamatan (kode Kemendagri) dan
-- kelurahan-nya. Kode KELURAHAN sengaja dibiarkan kosong (belum ada
-- sumber resmi) -- diisi lewat menu Referensi > Kecamatan.
-- Dipakai Lap. BBP untuk mengisi KODE KECAMATAN / KODE KELURAHAN.
-- Jalankan di Supabase -> SQL Editor.
-- =====================================================================

create table if not exists ref_kecamatan (
  kode text primary key,          -- mis. 65.71.01
  nama text not null
);

create table if not exists ref_kelurahan (
  id uuid primary key default gen_random_uuid(),
  kecamatan_kode text not null references ref_kecamatan(kode) on delete cascade,
  nama text not null,
  kode text,                      -- kode kelurahan, diisi manual
  unique (kecamatan_kode, nama)
);

insert into ref_kecamatan (kode, nama) values
  ('65.71.01', 'Tarakan Barat'),
  ('65.71.02', 'Tarakan Tengah'),
  ('65.71.03', 'Tarakan Timur'),
  ('65.71.04', 'Tarakan Utara')
on conflict (kode) do nothing;

insert into ref_kelurahan (kecamatan_kode, nama) values
  ('65.71.01', 'Karang Anyar'),
  ('65.71.01', 'Karang Anyar Pantai'),
  ('65.71.01', 'Karang Balik'),
  ('65.71.01', 'Karang Harapan'),
  ('65.71.01', 'Karang Rejo'),
  ('65.71.02', 'Kampung 1 Skip'),
  ('65.71.02', 'Pamusian'),
  ('65.71.02', 'Sebengkok'),
  ('65.71.02', 'Selumit'),
  ('65.71.02', 'Selumit Pantai'),
  ('65.71.03', 'Gunung Lingkas'),
  ('65.71.03', 'Lingkas Ujung'),
  ('65.71.03', 'Kampung IV'),
  ('65.71.03', 'Kampung VI'),
  ('65.71.03', 'Mamburungan'),
  ('65.71.03', 'Mamburungan Timur'),
  ('65.71.03', 'Pantai Amal'),
  ('65.71.04', 'Juata Kerikil'),
  ('65.71.04', 'Juata Laut'),
  ('65.71.04', 'Juata Permai')
on conflict (kecamatan_kode, nama) do nothing;

alter table ref_kecamatan enable row level security;
alter table ref_kelurahan enable row level security;

drop policy if exists "Lihat ref_kecamatan" on ref_kecamatan;
create policy "Lihat ref_kecamatan" on ref_kecamatan for select to authenticated using (true);
drop policy if exists "Admin kelola ref_kecamatan" on ref_kecamatan;
create policy "Admin kelola ref_kecamatan" on ref_kecamatan for all to authenticated
  using (current_user_role() in ('admin', 'kepala_sekolah'))
  with check (current_user_role() in ('admin', 'kepala_sekolah'));

drop policy if exists "Lihat ref_kelurahan" on ref_kelurahan;
create policy "Lihat ref_kelurahan" on ref_kelurahan for select to authenticated using (true);
drop policy if exists "Admin kelola ref_kelurahan" on ref_kelurahan;
create policy "Admin kelola ref_kelurahan" on ref_kelurahan for all to authenticated
  using (current_user_role() in ('admin', 'kepala_sekolah'))
  with check (current_user_role() in ('admin', 'kepala_sekolah'));
