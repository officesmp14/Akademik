-- =====================================================================
-- Tambah kolom tanggal_masuk_sekolah ke siswa01, dipakai di form
-- Registrasi Peserta Didik.
-- Jalankan di Supabase -> SQL Editor.
-- =====================================================================

alter table siswa01 add column if not exists tanggal_masuk_sekolah date;
