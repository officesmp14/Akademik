-- =====================================================================
-- Supervisi ternyata dicatat per TAHUN (angka kalender, mis. 2026),
-- bukan per tahun ajaran ("2026/2027"). Ganti kolom tahun_ajaran jadi
-- tahun (smallint), dan tambah kolom deskripsi pokok bahasan.
--
-- drop column "if exists" supaya aman dijalankan walau migrasi
-- jadwal-supervisi-tambah-tahun-ajaran.sql sebelumnya belum sempat
-- dijalankan.
-- Jalankan di Supabase -> SQL Editor.
-- =====================================================================

alter table jadwal_supervisi drop column if exists tahun_ajaran;

alter table jadwal_supervisi add column if not exists tahun smallint not null
  default extract(year from now())::smallint;
alter table jadwal_supervisi alter column tahun drop default;
alter table jadwal_supervisi add constraint jadwal_supervisi_tahun_check check (tahun between 2000 and 2100);

alter table jadwal_supervisi add column if not exists deskripsi_pokok_bahasan text;
