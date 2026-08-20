-- =====================================================================
-- Tambahan: kolom keterangan/alasan saat pengajuan mutasi masuk
-- diterima atau ditolak. Jalankan kalau tabel siswa_mutasi_masuk
-- sudah pernah dibuat sebelumnya.
-- =====================================================================

alter table siswa_mutasi_masuk add column if not exists keterangan text;
