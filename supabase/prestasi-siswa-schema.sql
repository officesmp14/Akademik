-- =====================================================================
-- Prestasi Siswa -- catatan prestasi akademik/non akademik siswa
-- (tingkat sekolah s.d. internasional). Satu baris per prestasi per siswa.
--
-- Akses (RLS):
--   - admin & kepala_sekolah: lihat + kelola semua
--   - user dengan Hak Akses modul 'prestasi_siswa': can_view -> lihat,
--     can_edit -> kelola
--   - wali kelas: lihat + kelola prestasi siswa di rombel kelasnya sendiri
--     (pakai current_user_kelas(), lihat fix-current-user-kelas.sql)
-- Jalankan di Supabase -> SQL Editor.
-- =====================================================================

create table if not exists prestasi_siswa (
  id uuid primary key default gen_random_uuid(),
  siswa_id uuid not null references siswa01(id) on delete cascade,
  tahun_ajaran text not null,
  bidang text not null check (bidang in ('Akademik', 'Non Akademik')),
  cabang text,                       -- mis. Olimpiade Matematika, Futsal, Tahfidz
  nama_kegiatan text not null,
  tingkat text not null check (tingkat in ('Sekolah', 'Kecamatan', 'Kota', 'Provinsi', 'Nasional', 'Internasional')),
  jenis text not null default 'Individu' check (jenis in ('Individu', 'Tim/Kelompok')),
  peringkat text not null,           -- mis. Juara 1, Harapan 2, Medali Emas, Finalis
  penyelenggara text,
  tanggal date,
  bukti_url text,                    -- link sertifikat/dokumentasi
  keterangan text,
  created_by uuid default auth.uid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists prestasi_siswa_siswa_id_idx on prestasi_siswa (siswa_id);
create index if not exists prestasi_siswa_tahun_ajaran_idx on prestasi_siswa (tahun_ajaran);

alter table prestasi_siswa enable row level security;

drop policy if exists "Lihat prestasi_siswa" on prestasi_siswa;
create policy "Lihat prestasi_siswa"
  on prestasi_siswa for select
  to authenticated
  using (
    current_user_role() in ('admin', 'kepala_sekolah')
    or exists (
      select 1 from user_module_access uma
      where uma.user_id = auth.uid() and uma.module = 'prestasi_siswa' and uma.can_view
    )
    or exists (
      select 1 from siswa01 s
      where s.id = prestasi_siswa.siswa_id and s.rombel = current_user_kelas()
    )
  );

drop policy if exists "Kelola prestasi_siswa" on prestasi_siswa;
create policy "Kelola prestasi_siswa"
  on prestasi_siswa for all
  to authenticated
  using (
    current_user_role() in ('admin', 'kepala_sekolah')
    or exists (
      select 1 from user_module_access uma
      where uma.user_id = auth.uid() and uma.module = 'prestasi_siswa' and uma.can_edit
    )
    or exists (
      select 1 from siswa01 s
      where s.id = prestasi_siswa.siswa_id and s.rombel = current_user_kelas()
    )
  )
  with check (
    current_user_role() in ('admin', 'kepala_sekolah')
    or exists (
      select 1 from user_module_access uma
      where uma.user_id = auth.uid() and uma.module = 'prestasi_siswa' and uma.can_edit
    )
    or exists (
      select 1 from siswa01 s
      where s.id = prestasi_siswa.siswa_id and s.rombel = current_user_kelas()
    )
  );
