-- =====================================================================
-- Analisis Kebutuhan Guru -- tambah kolom hasil hitungan supaya SEMUA
-- kolom yang tampil di /laporan/analisis-kebutuhan tersimpan per
-- (tahun_ajaran, mapel), jadi bisa dilaporkan/di-query langsung dari DB.
--
-- Sumber tiap kolom:
--   rombel_7/8/9, jumlah_rombel, jjm -> tabel pelajaran
--   waka_perpus_lab                  -> gtk_penugasan_mengajar.jam_tugas_tambahan (>=12 jadi 12)
--   guru_pns/pppk/honor              -> datagtk.kompetensi (Isi Otomatis), bisa dikoreksi
--   jumlah_guru                      = pns + pppk + honor
--   jml_jjm                          = jjm * jumlah_rombel
--   total_jam                        = jml_jjm + waka_perpus_lab
--   kebutuhan_pns                    = total_jam / 24
--   abk                              = floor(kebutuhan_pns)
--   jam_per_guru                     = total_jam / jumlah_guru
--   kurang_lebih                     = jumlah_guru - abk
-- Jalankan di Supabase -> SQL Editor (setelah analisis-kebutuhan-guru-schema.sql).
-- =====================================================================

alter table analisis_kebutuhan_guru
  add column if not exists jumlah_guru int,
  add column if not exists jumlah_rombel int,
  add column if not exists jml_jjm int,
  add column if not exists total_jam int,
  add column if not exists kebutuhan_pns numeric(8,2),
  add column if not exists jam_per_guru numeric(8,2),
  add column if not exists kurang_lebih int;
