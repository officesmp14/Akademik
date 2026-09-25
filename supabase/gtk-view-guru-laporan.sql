-- =====================================================================
-- Guru boleh membuka halaman Analisis Kebutuhan & Status Update GTK,
-- tapi policy RLS datagtk / gtk_penugasan_mengajar hanya mengizinkan guru
-- membaca datanya SENDIRI (tabel itu berisi NIK, gaji, alamat, dll).
-- Supaya angka di dua halaman itu tetap benar untuk guru, dibuat VIEW yang
-- cuma expose kolom yang perlu (tanpa data sensitif). View dibuat tanpa
-- security_invoker sehingga berjalan dengan privilese pembuatnya (bypass
-- RLS) -- pola yang sama dengan gtk_nama_publik.
-- Jalankan di Supabase -> SQL Editor.
-- =====================================================================

-- Halaman Status Update GTK
create or replace view public.gtk_status_update_publik as
select id, nama, nip, jenis_ptk, status_aktif, created_at, updated_at, updated_by_nama
from datagtk;

-- Halaman Analisis Kebutuhan: pencocokan mapel dari kompetensi
create or replace view public.gtk_analisis_kebutuhan_publik as
select id, kompetensi, jenis_ptk, status_aktif
from datagtk;

-- Halaman Analisis Kebutuhan: jam tugas tambahan (Waka/Perpus/Lab)
create or replace view public.gtk_penugasan_analisis_kebutuhan_publik as
select gtk_id, tahun_ajaran, jam_tugas_tambahan
from gtk_penugasan_mengajar;

grant select on public.gtk_status_update_publik to authenticated;
grant select on public.gtk_analisis_kebutuhan_publik to authenticated;
grant select on public.gtk_penugasan_analisis_kebutuhan_publik to authenticated;
