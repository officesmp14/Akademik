-- =====================================================================
-- Tabel Referensi: Jenis Pendaftaran (kode, uraian)
-- Jalankan di Supabase -> SQL Editor.
-- Data (kode & uraian) diisi lewat menu Referensi di aplikasi, bukan
-- lewat SQL, karena tidak ada data awal yang diberikan.
-- =====================================================================

create table if not exists ref_jenis_pendaftaran (
  kode integer primary key,
  uraian varchar not null
);

alter table ref_jenis_pendaftaran enable row level security;

drop policy if exists "Authenticated users can view ref_jenis_pendaftaran" on ref_jenis_pendaftaran;
create policy "Authenticated users can view ref_jenis_pendaftaran"
  on ref_jenis_pendaftaran for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can manage ref_jenis_pendaftaran" on ref_jenis_pendaftaran;
create policy "Authenticated users can manage ref_jenis_pendaftaran"
  on ref_jenis_pendaftaran for all
  to authenticated
  using (true)
  with check (true);
