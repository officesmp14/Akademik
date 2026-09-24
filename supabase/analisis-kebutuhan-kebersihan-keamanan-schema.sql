-- =====================================================================
-- Analisis Kebutuhan Petugas Kebersihan & Keamanan -- satu baris per
-- tahun ajaran. Kebutuhan petugas kebersihan dihitung otomatis dari
-- jumlah murid aktif (rasio 1:200, sesuai rumus di Excel Dinas
-- Pendidikan), sisanya (Bazzeting kebersihan, Bazzeting & Kebutuhan
-- keamanan) input manual karena tidak ada rumus/data lain untuk itu.
-- Jalankan di Supabase -> SQL Editor.
-- =====================================================================

create table if not exists analisis_kebutuhan_kebersihan_keamanan (
  id uuid primary key default gen_random_uuid(),
  tahun_ajaran text not null unique,
  kebersihan_bazzeting int,
  keamanan_bazzeting int,
  keamanan_kebutuhan int,
  updated_at timestamptz default now()
);

alter table analisis_kebutuhan_kebersihan_keamanan enable row level security;

drop policy if exists "Authenticated users can view analisis_kebutuhan_kebersihan_keamanan" on analisis_kebutuhan_kebersihan_keamanan;
create policy "Authenticated users can view analisis_kebutuhan_kebersihan_keamanan"
  on analisis_kebutuhan_kebersihan_keamanan for select
  to authenticated
  using (true);

drop policy if exists "Admin/Hak Akses kelola analisis_kebutuhan_kebersihan_keamanan" on analisis_kebutuhan_kebersihan_keamanan;
create policy "Admin/Hak Akses kelola analisis_kebutuhan_kebersihan_keamanan"
  on analisis_kebutuhan_kebersihan_keamanan for all
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
