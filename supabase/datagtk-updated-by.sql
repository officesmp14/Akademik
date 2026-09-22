-- =====================================================================
-- Tambah kolom untuk mencatat SIAPA & KAPAN terakhir mengubah data
-- seorang GTK -- sama seperti siswa01-updated-by.sql, dipakai di Laporan
-- > Status Update Data GTK supaya admin bisa melihat siapa saja yang
-- sudah memperbarui profilnya sendiri.
--
-- updated_by_nama disimpan sebagai teks (denormalisasi) langsung dari
-- sisi klien saat menyimpan, sama seperti siswa01, supaya halaman
-- laporan tidak perlu query tambahan.
--
-- datagtk.updated_at kolomnya sudah ada sejak awal (default now() saat
-- insert), tapi belum pernah diisi ulang otomatis/manual saat update --
-- GtkForm sekarang mengisinya manual setiap kali form edit disimpan.
-- Jalankan di Supabase -> SQL Editor.
-- =====================================================================

alter table datagtk add column if not exists updated_by uuid;
alter table datagtk add column if not exists updated_by_nama varchar;
