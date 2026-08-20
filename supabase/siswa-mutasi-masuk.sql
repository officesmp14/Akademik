-- =====================================================================
-- Siswa Mutasi Masuk (pengajuan siswa pindahan dari sekolah lain)
-- Tabel terpisah dari siswa01 -- begitu pengajuan "Diterima", sistem
-- otomatis membuat data siswa baru di siswa01 dan menautkan siswa_id.
-- Dokumen disimpan di Supabase Storage bucket privat "dokumen-mutasi-masuk"
-- (bukan bucket publik "logos" yang sudah ada, karena dokumen ini berisi
-- data pribadi seperti NIK).
-- Jalankan di Supabase -> SQL Editor.
-- =====================================================================

create table if not exists siswa_mutasi_masuk (
  id uuid primary key default gen_random_uuid(),
  nama_siswa varchar not null,
  nisn varchar,
  asal_provinsi varchar,
  asal_kab_kota varchar,
  asal_kecamatan varchar,
  asal_npsn_sekolah varchar,
  asal_nama_sekolah varchar,
  kelas_tujuan varchar,
  dok_kk text,
  dok_rekomendasi text,
  dok_surat_keterangan_pindah text,
  dok_legalisir_ijazah_sd text,
  dok_akte_kelahiran text,
  status varchar not null default 'Diajukan' check (status in ('Diajukan', 'Diterima', 'Ditolak')),
  keterangan text,
  siswa_id uuid references siswa01(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table siswa_mutasi_masuk enable row level security;

drop policy if exists "Authenticated users can view siswa_mutasi_masuk" on siswa_mutasi_masuk;
create policy "Authenticated users can view siswa_mutasi_masuk"
  on siswa_mutasi_masuk for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can manage siswa_mutasi_masuk" on siswa_mutasi_masuk;
create policy "Authenticated users can manage siswa_mutasi_masuk"
  on siswa_mutasi_masuk for all
  to authenticated
  using (true)
  with check (true);

-- =====================================================================
-- Storage: bucket privat untuk dokumen (KK, rekomendasi, surat pindah,
-- legalisir ijazah, akte kelahiran). Akses lewat signed URL, bukan URL
-- publik permanen.
-- =====================================================================

insert into storage.buckets (id, name, public)
values ('dokumen-mutasi-masuk', 'dokumen-mutasi-masuk', false)
on conflict (id) do nothing;

drop policy if exists "Authenticated users can view dokumen mutasi masuk" on storage.objects;
create policy "Authenticated users can view dokumen mutasi masuk"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'dokumen-mutasi-masuk');

drop policy if exists "Authenticated users can upload dokumen mutasi masuk" on storage.objects;
create policy "Authenticated users can upload dokumen mutasi masuk"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'dokumen-mutasi-masuk');

drop policy if exists "Authenticated users can update dokumen mutasi masuk" on storage.objects;
create policy "Authenticated users can update dokumen mutasi masuk"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'dokumen-mutasi-masuk')
  with check (bucket_id = 'dokumen-mutasi-masuk');

drop policy if exists "Authenticated users can delete dokumen mutasi masuk" on storage.objects;
create policy "Authenticated users can delete dokumen mutasi masuk"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'dokumen-mutasi-masuk');
