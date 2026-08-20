-- =====================================================================
-- Bug: di /rapor-sts, wali kelas yang juga guru mapel cuma melihat mata
-- pelajaran yang DIA SENDIRI ajar, bukan semua mapel yang diajarkan guru
-- lain di kelasnya. Rapor jadi tidak lengkap.
--
-- Root cause: policy SELECT guru_mengajar_kelas yang aktif cuma
-- mengizinkan (a) admin, (b) kepala sekolah, dan (c) guru untuk BARIS
-- MILIKNYA SENDIRI (gtk_id = current_user_gtk_id()). Tidak ada policy
-- yang mengizinkan wali kelas melihat SEMUA penugasan mengajar di
-- kelasnya sendiri -- padahal tabel siswa01 dan nilai sudah punya
-- policy setara ini ("Wali kelas view own rombel siswa",
-- "Wali kelas view nilai kelasnya"), guru_mengajar_kelas saja yang
-- ketinggalan.
--
-- Fix: tambah SATU policy SELECT baru (permissive, jadi hanya MENAMBAH
-- akses, tidak mengubah/menghapus policy yang sudah ada), pola sama
-- persis dengan dua policy wali kelas yang sudah ada di tabel lain.
--
-- Jalankan di Supabase -> SQL Editor.
-- =====================================================================

drop policy if exists "Wali kelas view mengajar kelas kelasnya" on guru_mengajar_kelas;
create policy "Wali kelas view mengajar kelas kelasnya"
  on guru_mengajar_kelas for select
  to authenticated
  using (
    exists (
      select 1
      from wali_kelas wk
      where wk.gtk_id = current_user_gtk_id()
        and (wk.rombel)::text = (guru_mengajar_kelas.rombel)::text
    )
  );
