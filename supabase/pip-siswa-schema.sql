-- =====================================================================
-- SIPINTAR > Data PIP -- data calon/penerima PIP per siswa, mengikuti file
-- Excel "dataPIP.xlsx" (sheet "Data" = seluruh usulan, sheet "seleksi" =
-- siswa yang terseleksi + kelasnya). Satu baris per siswa (unik per NISN).
-- Diisi lewat tombol "Import Excel" di halaman /data-pip.
--
-- Akses (RLS) -- data berisi NIK & data orang tua, jadi dibatasi:
--   - admin & kepala_sekolah: lihat + kelola semua
--   - Hak Akses modul 'data_pip': can_view -> lihat, can_edit -> kelola
-- Jalankan di Supabase -> SQL Editor.
-- =====================================================================

create table if not exists pip_siswa (
  id uuid primary key default gen_random_uuid(),
  nisn text not null unique,
  nik text,
  nama text not null,
  jk text,                       -- L / P
  tempat_lahir text,
  tanggal_lahir date,
  nama_ibu text,
  pekerjaan_ibu text,
  penghasilan_ibu text,
  nama_ayah text,
  pekerjaan_ayah text,
  penghasilan_ayah text,
  nama_wali text,
  pekerjaan_wali text,
  penghasilan_wali text,
  telepon text,
  kelas text,                    -- 7 / 8 / 9 (kolom "Kelas" di file)
  semester_id text,              -- mis. 20261
  nominal_id text,               -- kolom "Nominal ID" di file
  desil text,
  bank text,
  status_tabunganku text,
  valid_dukcapil boolean,
  valid_nisn boolean,
  terseleksi boolean not null default false,  -- ada di sheet "seleksi"
  kelas_seleksi text,            -- mis. 7.1 (kolom KELAS sheet seleksi)
  alasan text,                   -- kolom ALASAN sheet seleksi
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists pip_siswa_kelas_idx on pip_siswa (kelas);

alter table pip_siswa enable row level security;

drop policy if exists "Lihat pip_siswa" on pip_siswa;
create policy "Lihat pip_siswa"
  on pip_siswa for select
  to authenticated
  using (
    current_user_role() in ('admin', 'kepala_sekolah')
    or exists (
      select 1 from user_module_access uma
      where uma.user_id = auth.uid() and uma.module = 'data_pip' and uma.can_view
    )
  );

drop policy if exists "Kelola pip_siswa" on pip_siswa;
create policy "Kelola pip_siswa"
  on pip_siswa for all
  to authenticated
  using (
    current_user_role() in ('admin', 'kepala_sekolah')
    or exists (
      select 1 from user_module_access uma
      where uma.user_id = auth.uid() and uma.module = 'data_pip' and uma.can_edit
    )
  )
  with check (
    current_user_role() in ('admin', 'kepala_sekolah')
    or exists (
      select 1 from user_module_access uma
      where uma.user_id = auth.uid() and uma.module = 'data_pip' and uma.can_edit
    )
  );
