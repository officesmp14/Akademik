-- =====================================================================
-- Tambah kolom untuk mencatat kapan & kenapa seorang GTK jadi
-- Tidak Aktif. datagtk.status_aktif sudah ada sebelumnya tapi
-- kolomnya varchar(1) -- dipakai sebagai kode 'Y' (Aktif) / 'N'
-- (Tidak Aktif), bukan teks panjang.
-- Jalankan di Supabase -> SQL Editor.
-- =====================================================================

alter table datagtk add column if not exists tanggal_tidak_aktif date;
alter table datagtk add column if not exists alasan_tidak_aktif text;
