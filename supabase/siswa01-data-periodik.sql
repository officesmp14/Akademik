-- =====================================================================
-- Tambah kolom untuk fitur Data Periodik:
-- - jarak_rumah (sudah ada) dipakai ulang untuk simpan kategori
--   "Kurang 1 km" / "Lebih 1 km", jarak_rumah_km (baru) untuk angka
--   pasti saat kategori "Lebih 1 km".
-- - jarak_tempuh (sudah ada) dipakai ulang untuk field "Menit",
--   jarak_tempuh_jam (baru) untuk field "Jam".
-- Jalankan di Supabase -> SQL Editor.
-- =====================================================================

alter table siswa01 add column if not exists jarak_rumah_km varchar;
alter table siswa01 add column if not exists jarak_tempuh_jam varchar;
