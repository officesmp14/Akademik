-- =====================================================================
-- Bug: guru yang mengajar suatu kelas (tercatat di guru_mengajar_kelas)
-- tapi BUKAN wali kelas di kelas itu, tidak bisa melihat daftar siswanya
-- sama sekali -- termasuk saat input nilai (nilai-sts, nilai) karena
-- halaman itu query siswa01 dulu untuk membangun daftar siswa per kelas.
--
-- Root cause: policy SELECT siswa01 yang aktif cuma mengizinkan (a) admin,
-- (b) kepala sekolah, (c) user dengan hak akses modul 'siswa' eksplisit,
-- dan (d) wali kelas untuk KELASNYA SENDIRI. Tidak ada policy yang
-- mengizinkan guru mata pelajaran melihat siswa di kelas yang dia ajar
-- (guru_mengajar_kelas) kalau dia bukan wali kelasnya.
--
-- Fix: tambah SATU policy SELECT baru (permissive, jadi hanya MENAMBAH
-- akses, tidak mengubah/menghapus policy siswa01 yang sudah ada). Polanya
-- disamakan dengan policy "Wali kelas view own rombel siswa" yang sudah
-- ada, tapi sumber kelasnya dari guru_mengajar_kelas bukan wali_kelas.
--
-- Jalankan di Supabase -> SQL Editor.
-- =====================================================================

drop policy if exists "Guru mengajar view siswa di kelasnya" on siswa01;
create policy "Guru mengajar view siswa di kelasnya"
  on siswa01 for select
  to authenticated
  using (
    exists (
      select 1
      from guru_mengajar_kelas gmk
      where gmk.gtk_id = current_user_gtk_id()
        and (gmk.rombel)::text = (siswa01.rombel)::text
    )
  );
