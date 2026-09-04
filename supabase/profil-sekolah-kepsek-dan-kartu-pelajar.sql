-- =====================================================================
-- Tambah kolom data Kepala Sekolah (nama, NIP, tanda tangan, cap/stempel)
-- dan template kartu pelajar ke tabel profil_sekolah.
-- File gambar (tanda tangan, cap, template kartu) disimpan di bucket
-- Storage "logos" yang sudah ada, sama seperti logo sekolah/dinas.
-- Jalankan di Supabase -> SQL Editor.
-- =====================================================================

alter table profil_sekolah add column if not exists nama_kepala_sekolah varchar;
alter table profil_sekolah add column if not exists nip_kepala_sekolah varchar;
alter table profil_sekolah add column if not exists ttd_kepala_sekolah_url text;
alter table profil_sekolah add column if not exists cap_sekolah_url text;
alter table profil_sekolah add column if not exists template_kartu_pelajar_url text;
