-- =====================================================================
-- Tambah kolom link_dokumen di tabel jadwal_supervisi, supaya guru bisa
-- melampirkan link dokumen yang sudah disiapkan (biasanya Google Drive)
-- untuk sesi supervisinya.
-- Jalankan di Supabase -> SQL Editor.
-- =====================================================================

alter table jadwal_supervisi add column if not exists link_dokumen text;
