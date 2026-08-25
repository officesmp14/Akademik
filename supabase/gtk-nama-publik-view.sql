-- =====================================================================
-- Bug: di /jadwal-kombel, guru/staf TU (yang cuma boleh SELECT datagtk
-- miliknya sendiri lewat policy "Guru TU view own datagtk") melihat
-- "- Tidak diketahui -" untuk nama guru lain di jadwal, karena query
-- select semua datagtk cuma balik 1 baris (miliknya sendiri).
--
-- Fix yang BENAR bukan membuka akses penuh tabel datagtk ke semua user
-- (tabel itu berisi data sensitif: NIK, gaji, alamat, dll) -- melainkan
-- bikin VIEW yang cuma expose id & nama (data yang aman dilihat siapa
-- saja yang login), lalu halaman jadwal-kombel pakai view ini khusus
-- untuk menampilkan nama guru di jadwal (bukan untuk form Tambah yang
-- tetap pakai tabel datagtk asli, karena cuma admin/kepsek yang bisa
-- buka form itu dan mereka sudah punya akses penuh).
--
-- View ini dibuat TANPA security_invoker, jadi tetap berjalan dengan
-- privilese pembuatnya (bypass RLS datagtk) walau yang query adalah
-- guru biasa -- pola standar Postgres/Supabase untuk expose subset
-- kolom yang aman dari tabel yang RLS-nya ketat.
-- Jalankan di Supabase -> SQL Editor.
-- =====================================================================

create or replace view public.gtk_nama_publik as
select id, nama from datagtk;

grant select on public.gtk_nama_publik to authenticated;
