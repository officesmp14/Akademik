-- =====================================================================
-- Tabel Referensi: Jenis PTK Dinas Pendidikan (kode, uraian)
-- Jalankan di Supabase -> SQL Editor.
-- Data (kode & uraian) diisi lewat menu Referensi di aplikasi, bukan
-- lewat SQL, karena tidak ada data awal yang diberikan.
-- =====================================================================

create table if not exists ref_jenisptk_dinaspdd (
  kode integer primary key,
  uraian varchar not null
);

alter table ref_jenisptk_dinaspdd enable row level security;

drop policy if exists "Authenticated users can view ref_jenisptk_dinaspdd" on ref_jenisptk_dinaspdd;
create policy "Authenticated users can view ref_jenisptk_dinaspdd"
  on ref_jenisptk_dinaspdd for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can manage ref_jenisptk_dinaspdd" on ref_jenisptk_dinaspdd;
create policy "Authenticated users can manage ref_jenisptk_dinaspdd"
  on ref_jenisptk_dinaspdd for all
  to authenticated
  using (true)
  with check (true);
