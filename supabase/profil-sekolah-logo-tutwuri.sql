-- =====================================================================
-- Profil Sekolah: tambah logo "Tut Wuri Handayani" (disimpan di bucket
-- storage 'logos' sebagai logo_tutwuri.png, URL-nya di kolom ini).
-- Jalankan di Supabase -> SQL Editor.
-- =====================================================================

alter table profil_sekolah add column if not exists logo_tutwuri_url text;
