-- =====================================================================
-- Background Sertifikat -- gambar latar penuh (A4 Landscape) untuk Cetak
-- Sertifikat. RLS-nya sudah ditangani oleh policy pengaturan_skl yang ada
-- (view semua, kelola cuma admin/kepala sekolah), jadi cukup tambah kolom.
-- Jalankan di Supabase -> SQL Editor.
-- =====================================================================

alter table pengaturan_skl add column if not exists background_sertifikat_url text;
