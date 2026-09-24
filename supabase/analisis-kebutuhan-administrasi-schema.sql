-- =====================================================================
-- Analisis Kebutuhan Tenaga Administrasi -- satu baris per tahun ajaran,
-- 4 kategori (sesuai format Excel Dinas Pendidikan): Penelaah Teknis
-- Kebijakan, Pengadministrasi Perkantoran (rincian PNS/PPPK/Honor),
-- Pengelola Layanan Operasional, Penata Layanan Operasional. Semua
-- kolom input manual -- tidak ada tabel lain yang melacak jenis
-- tenaga kependidikan sedetail ini.
-- Jalankan di Supabase -> SQL Editor.
-- =====================================================================

create table if not exists analisis_kebutuhan_administrasi (
  id uuid primary key default gen_random_uuid(),
  tahun_ajaran text not null unique,
  penelaah_bazzeting int,
  penelaah_kebutuhan int,
  pengadministrasi_pns int,
  pengadministrasi_pppk int,
  pengadministrasi_honor int,
  pengadministrasi_kebutuhan int,
  pengelola_bazzeting int,
  pengelola_kebutuhan int,
  penata_bazzeting int,
  penata_kebutuhan int,
  updated_at timestamptz default now()
);

alter table analisis_kebutuhan_administrasi enable row level security;

drop policy if exists "Authenticated users can view analisis_kebutuhan_administrasi" on analisis_kebutuhan_administrasi;
create policy "Authenticated users can view analisis_kebutuhan_administrasi"
  on analisis_kebutuhan_administrasi for select
  to authenticated
  using (true);

drop policy if exists "Admin/Hak Akses kelola analisis_kebutuhan_administrasi" on analisis_kebutuhan_administrasi;
create policy "Admin/Hak Akses kelola analisis_kebutuhan_administrasi"
  on analisis_kebutuhan_administrasi for all
  to authenticated
  using (
    current_user_role() in ('admin', 'kepala_sekolah')
    or exists (
      select 1 from user_module_access uma
      where uma.user_id = auth.uid()
        and uma.module = 'analisis_kebutuhan'
        and uma.can_edit
    )
  )
  with check (
    current_user_role() in ('admin', 'kepala_sekolah')
    or exists (
      select 1 from user_module_access uma
      where uma.user_id = auth.uid()
        and uma.module = 'analisis_kebutuhan'
        and uma.can_edit
    )
  );
