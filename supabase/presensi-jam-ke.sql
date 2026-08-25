-- =====================================================================
-- Tambah kolom jam_ke (jam pelajaran ke berapa: 1-8) di tabel presensi,
-- supaya guru bisa mencatat presensi lebih dari 1 kali dalam sehari
-- untuk mapel yang sama (mis. jam pelajaran ganda/beruntun).
--
-- Constraint unique lama (siswa_id, mapel_id, rombel, tanggal) diganti
-- supaya ikut membedakan jam_ke -- kalau tidak, presensi jam ke-2 di
-- hari yang sama akan menimpa presensi jam ke-1.
--
-- Jalankan di Supabase -> SQL Editor.
-- =====================================================================

alter table presensi add column if not exists jam_ke smallint not null default 1 check (jam_ke between 1 and 8);

alter table presensi drop constraint if exists presensi_siswa_id_mapel_id_rombel_tanggal_key;
alter table presensi add constraint presensi_siswa_id_mapel_id_rombel_tanggal_jam_ke_key
  unique (siswa_id, mapel_id, rombel, tanggal, jam_ke);
