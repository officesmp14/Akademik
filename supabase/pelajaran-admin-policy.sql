-- =====================================================================
-- Halaman Referensi > Pelajaran (/referensi/pelajaran) mengubah/menambah/
-- menghapus tabel pelajaran, tapi tabel ini belum punya policy tulis --
-- update yang ditolak RLS tidak memberi error, cuma mengubah 0 baris
-- (makanya "Isi Jumlah Rombel Semua" tampak berhasil tapi tidak ada data
-- yang tersimpan). Policy ini ADDITIF (permisif), tidak menggantikan
-- policy select yang sudah ada.
-- Jalankan di Supabase -> SQL Editor.
-- =====================================================================

alter table pelajaran enable row level security;

drop policy if exists "Admin kelola pelajaran" on pelajaran;
create policy "Admin kelola pelajaran"
  on pelajaran for all
  to authenticated
  using (current_user_role() in ('admin', 'kepala_sekolah'))
  with check (current_user_role() in ('admin', 'kepala_sekolah'));

-- Pastikan semua user login tetap bisa membaca (dipakai nilai, presensi, dll)
drop policy if exists "Authenticated users can view pelajaran" on pelajaran;
create policy "Authenticated users can view pelajaran"
  on pelajaran for select
  to authenticated
  using (true);
