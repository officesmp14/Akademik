-- =====================================================================
-- Bug: Ketua/Sekretaris Panitia Hibot yang berperan guru biasa cuma bisa
-- lihat siswa di kelas yang dia ajar/walikan di laporan Ganak Hibot
-- (dropdown kelas & datanya ikut terbatas), padahal panitia seharusnya
-- bisa lihat SEMUA kelas.
--
-- Root cause: policy SELECT siswa01 yang aktif cuma mengizinkan (a) admin,
-- (b) kepala sekolah, (c) user dengan hak akses modul 'siswa' eksplisit,
-- (d) wali kelas untuk kelasnya sendiri, dan (e) guru mengajar untuk
-- kelas yang dia ajar. Tidak ada policy untuk Panitia Hibot.
--
-- Fix: tambah SATU policy SELECT baru (permissive, hanya menambah akses),
-- pola sama seperti "Guru mengajar view siswa di kelasnya", tapi
-- syaratnya keanggotaan panitia_hibot.
-- Jalankan di Supabase -> SQL Editor.
-- =====================================================================

drop policy if exists "Panitia Hibot view semua siswa" on siswa01;
create policy "Panitia Hibot view semua siswa"
  on siswa01 for select
  to authenticated
  using (
    exists (
      select 1
      from panitia_hibot ph
      where current_user_gtk_id() in (ph.ketua_gtk_id, ph.sekretaris_gtk_id)
    )
  );
