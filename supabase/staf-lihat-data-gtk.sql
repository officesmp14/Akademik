-- =====================================================================
-- Staf (datagtk.jenis_ptk_pdd = Pengadministrasi Perkantoran / Penata
-- Layanan Operasional / Penelaah Teknis Kebijakan) boleh MELIHAT (baca
-- saja) menu Data GTK -- semua data GTK, termasuk halaman detail beserta
-- tab Penugasan Mengajar. Policy RLS datagtk & gtk_penugasan_mengajar
-- sebelumnya hanya mengizinkan staf membaca datanya sendiri.
-- Butuh fungsi is_staf_lihat_siswa() dari staf-lihat-data-siswa.sql
-- (jalankan file itu dulu). Hanya SELECT -- tidak ada izin ubah/hapus.
-- Jalankan di Supabase -> SQL Editor.
-- =====================================================================

drop policy if exists "Staf PDD view semua datagtk" on datagtk;
create policy "Staf PDD view semua datagtk"
  on datagtk for select
  to authenticated
  using (is_staf_lihat_siswa());

drop policy if exists "Staf PDD view semua penugasan mengajar" on gtk_penugasan_mengajar;
create policy "Staf PDD view semua penugasan mengajar"
  on gtk_penugasan_mengajar for select
  to authenticated
  using (is_staf_lihat_siswa());
