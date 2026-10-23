-- =====================================================================
-- Lap. BBP (Lampiran SK Usulan Penerima Bantuan Biaya Pendidikan) butuh
-- KODE KELURAHAN & KODE KECAMATAN per siswa. Kode wilayah tidak ada di
-- data siswa maupun file Data PIP (kecuali kode kecamatan), jadi disimpan
-- di pip_siswa dan diisi dari halaman /data-pip/bbp.
-- Jalankan di Supabase -> SQL Editor (setelah pip-siswa-schema.sql).
-- =====================================================================

alter table pip_siswa
  add column if not exists kode_kelurahan text,
  add column if not exists kode_kecamatan text;
