-- =====================================================================
-- Tambah kolom kompetensi di datagtk (sebelumnya "kompetensi" cuma ada di
-- gtk_penugasan_mengajar, per penugasan). RLS tidak perlu diubah: policy
-- datagtk yang ada berlaku untuk semua kolom.
-- Jalankan di Supabase -> SQL Editor.
-- =====================================================================

alter table datagtk add column if not exists kompetensi text;
