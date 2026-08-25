-- =====================================================================
-- Tambah kode status "D" (Dispen / Dispensasi) ke tabel presensi.
-- Constraint check kolom status dibuat ulang dengan tambahan kode baru
-- (nama constraint bawaan Postgres untuk check inline: presensi_status_check).
--
-- Jalankan di Supabase -> SQL Editor.
-- =====================================================================

alter table presensi drop constraint if exists presensi_status_check;
alter table presensi add constraint presensi_status_check
  check (status in ('H', 'S', 'I', 'A', 'L', 'M', 'P', 'G', 'D'));
