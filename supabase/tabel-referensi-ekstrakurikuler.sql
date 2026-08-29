-- =====================================================================
-- Tabel Referensi: Ekstrakurikuler (kode, uraian)
-- Jalankan di Supabase -> SQL Editor.
-- Data (kode & uraian, mis. PMR, Basket, dll) diisi lewat menu Referensi
-- di aplikasi, bukan lewat SQL, karena tidak ada data awal yang diberikan.
-- =====================================================================

create table if not exists ref_ekstrakurikuler (
  kode integer primary key,
  uraian varchar not null
);

alter table ref_ekstrakurikuler enable row level security;

drop policy if exists "Authenticated users can view ref_ekstrakurikuler" on ref_ekstrakurikuler;
create policy "Authenticated users can view ref_ekstrakurikuler"
  on ref_ekstrakurikuler for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can manage ref_ekstrakurikuler" on ref_ekstrakurikuler;
create policy "Authenticated users can manage ref_ekstrakurikuler"
  on ref_ekstrakurikuler for all
  to authenticated
  using (true)
  with check (true);
