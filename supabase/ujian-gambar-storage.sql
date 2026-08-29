-- =====================================================================
-- Storage bucket untuk gambar yang disisipkan ke soal ujian (lewat
-- RichTextEditor di halaman Kelola Ujian). Publik (bukan privat) karena
-- gambar soal bukan data pribadi, dan situs siswa-ujian (aplikasi
-- terpisah, akses lewat service role key) perlu bisa menampilkannya
-- tanpa signed URL -- sama pola dengan bucket "logos" yang sudah ada.
-- Jalankan di Supabase -> SQL Editor.
-- =====================================================================

insert into storage.buckets (id, name, public)
values ('ujian-gambar', 'ujian-gambar', true)
on conflict (id) do nothing;

drop policy if exists "Public read gambar ujian" on storage.objects;
create policy "Public read gambar ujian"
  on storage.objects for select
  using (bucket_id = 'ujian-gambar');

drop policy if exists "Authenticated users can upload gambar ujian" on storage.objects;
create policy "Authenticated users can upload gambar ujian"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'ujian-gambar');

drop policy if exists "Authenticated users can update gambar ujian" on storage.objects;
create policy "Authenticated users can update gambar ujian"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'ujian-gambar')
  with check (bucket_id = 'ujian-gambar');

drop policy if exists "Authenticated users can delete gambar ujian" on storage.objects;
create policy "Authenticated users can delete gambar ujian"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'ujian-gambar');
