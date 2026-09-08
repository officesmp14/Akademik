-- =====================================================================
-- Laporan Ganak Hibot (dibuka Panitia Hibot -- guru biasa, bukan admin)
-- perlu menampilkan nama/NIP/No.HP wali kelas untuk kelas yang dipilih.
-- Query langsung ke tabel wali_kelas + datagtk dari client kena RLS
-- (guru biasa tidak diizinkan lihat data guru lain), jadi hasilnya selalu
-- "Wali kelas belum ditentukan" walau datanya ada.
--
-- Fix: function SECURITY DEFINER yang HANYA mengembalikan nama/NIP/HP
-- wali kelas untuk satu rombel tertentu (bukan seluruh data guru), jadi
-- tidak perlu melonggarkan RLS tabel wali_kelas/datagtk secara umum.
-- Jalankan di Supabase -> SQL Editor.
-- =====================================================================

create or replace function get_wali_kelas_info(p_rombel text)
returns table (nama text, nip text, hp text)
language sql
security definer
set search_path = public
as $$
  select g.nama, g.nip, g.hp
  from wali_kelas w
  join datagtk g on g.id = w.gtk_id
  where w.rombel = p_rombel
  limit 1;
$$;

grant execute on function get_wali_kelas_info(text) to authenticated;
