-- =====================================================================
-- Tambah kolom foto siswa (dipakai untuk Kartu Pelajar & keperluan lain).
-- Jalankan di Supabase -> SQL Editor.
-- =====================================================================

alter table siswa01 add column if not exists foto_url text;
