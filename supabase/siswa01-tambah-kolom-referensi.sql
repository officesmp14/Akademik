-- =====================================================================
-- Tambah kolom referensi ke siswa01: jenis pendaftaran, hobi, cita-cita.
-- Menyimpan "kode" dari tabel referensi terkait (ref_jenis_pendaftaran,
-- ref_hobi, ref_cita_cita), bukan uuid, karena tabel referensi
-- primary key-nya adalah kolom kode (integer).
-- Jalankan di Supabase -> SQL Editor.
-- =====================================================================

alter table siswa01 add column if not exists jenis_pendaftaran_id integer references ref_jenis_pendaftaran(kode);
alter table siswa01 add column if not exists id_hobby integer references ref_hobi(kode);
alter table siswa01 add column if not exists id_cita integer references ref_cita_cita(kode);
