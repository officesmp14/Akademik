-- =====================================================================
-- Tambah kolom link_dokumen di tabel siswa_mutasi_keluar, untuk
-- menyisipkan link bukti dokumen surat keluar Dapodik (biasanya
-- Google Drive).
-- Jalankan di Supabase -> SQL Editor.
-- =====================================================================

alter table siswa_mutasi_keluar add column if not exists link_dokumen text;
