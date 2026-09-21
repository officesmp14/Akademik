-- =====================================================================
-- Fix: guru tidak bisa menyimpan Penugasan Mengajar di profilnya sendiri
-- (/profil-saya -> tab Penugasan Mengajar) -- error yang muncul: "new row
-- violates row-level security policy for table gtk_penugasan_mengajar".
--
-- Tabel ini sudah RLS-enabled tapi belum ada policy yang mengizinkan guru
-- kelola baris miliknya sendiri (gtk_id = dirinya), jadi INSERT/UPDATE/
-- DELETE selalu ditolak kecuali dari service role. Policy ini menambahkan
-- akses (bersifat permisif/OR dengan policy admin yang mungkin sudah ada,
-- bukan menggantikannya), sama seperti pola akses modul di tabel lain
-- (nilai_leger dkk): admin/kepala sekolah selalu bisa, yang punya hak akses
-- modul 'gtk' (can_edit) bisa kelola punya siapa saja, dan setiap guru bisa
-- kelola penugasan mengajarnya sendiri.
-- Jalankan di Supabase -> SQL Editor.
-- =====================================================================

alter table gtk_penugasan_mengajar enable row level security;

drop policy if exists "Guru kelola penugasan mengajar sendiri" on gtk_penugasan_mengajar;
create policy "Guru kelola penugasan mengajar sendiri"
  on gtk_penugasan_mengajar for all
  to authenticated
  using (
    gtk_id = current_user_gtk_id()
    or current_user_role() in ('admin', 'kepala_sekolah')
    or exists (
      select 1 from user_module_access uma
      where uma.user_id = auth.uid()
        and uma.module = 'gtk'
        and uma.can_edit
    )
  )
  with check (
    gtk_id = current_user_gtk_id()
    or current_user_role() in ('admin', 'kepala_sekolah')
    or exists (
      select 1 from user_module_access uma
      where uma.user_id = auth.uid()
        and uma.module = 'gtk'
        and uma.can_edit
    )
  );
