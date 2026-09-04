-- =====================================================================
-- Storage bucket untuk foto siswa (dipakai di form Data Siswa & Kartu
-- Pelajar). Publik (bukan privat) supaya bisa langsung ditampilkan tanpa
-- signed URL -- sama pola dengan bucket "logos"/"ujian-gambar" yang
-- sudah ada. Jalankan di Supabase -> SQL Editor.
-- =====================================================================

insert into storage.buckets (id, name, public)
values ('foto-siswa', 'foto-siswa', true)
on conflict (id) do nothing;

drop policy if exists "Public read foto siswa" on storage.objects;
create policy "Public read foto siswa"
  on storage.objects for select
  using (bucket_id = 'foto-siswa');

drop policy if exists "Authenticated users can upload foto siswa" on storage.objects;
create policy "Authenticated users can upload foto siswa"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'foto-siswa');

drop policy if exists "Authenticated users can update foto siswa" on storage.objects;
create policy "Authenticated users can update foto siswa"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'foto-siswa')
  with check (bucket_id = 'foto-siswa');

drop policy if exists "Authenticated users can delete foto siswa" on storage.objects;
create policy "Authenticated users can delete foto siswa"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'foto-siswa');
