-- =====================================================================
-- Nilai Ujian Sekolah -- nilai Tertulis dan Praktik untuk siswa kelas IX
-- (ujian kelulusan), satu baris per (nisn, tahun_ajaran, jenis). Beda dari
-- nilai_leger: Agama cuma SATU kolom generik (bukan per-agama) karena guru
-- yang menginput sudah tahu ini nilai ujian agama siswa itu sendiri.
-- Jalankan di Supabase -> SQL Editor.
-- =====================================================================

create table if not exists nilai_ujian_sekolah (
  id uuid primary key default gen_random_uuid(),
  nisn varchar not null,
  tahun_ajaran varchar not null,
  jenis varchar not null check (jenis in ('Tertulis', 'Praktik')),
  -- Kelas siswa PADA SAAT nilai ini diinput (mis. "IX.1") -- sekadar info
  -- tampilan, bukan bagian dari kunci baris.
  kelas varchar,
  agama numeric,
  pkn numeric,
  bind numeric,
  mtk numeric,
  ipa numeric,
  ips numeric,
  bing numeric,
  pjok numeric,
  informatika numeric,
  prakarya numeric,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table nilai_ujian_sekolah drop constraint if exists nilai_ujian_sekolah_nisn_fkey;
alter table nilai_ujian_sekolah
  add constraint nilai_ujian_sekolah_nisn_fkey foreign key (nisn) references siswa01(nisn) on delete cascade;

alter table nilai_ujian_sekolah drop constraint if exists nilai_ujian_sekolah_nisn_tahun_ajaran_jenis_key;
alter table nilai_ujian_sekolah
  add constraint nilai_ujian_sekolah_nisn_tahun_ajaran_jenis_key unique (nisn, tahun_ajaran, jenis);

alter table nilai_ujian_sekolah enable row level security;

drop policy if exists "Authenticated users can view nilai_ujian_sekolah" on nilai_ujian_sekolah;
create policy "Authenticated users can view nilai_ujian_sekolah"
  on nilai_ujian_sekolah for select
  to authenticated
  using (true);

-- Boleh input/ubah/hapus kalau: admin/kepala sekolah, ATAU diberi hak akses
-- modul 'nilai_ujian_sekolah' lewat Hak Akses, ATAU wali kelas IX untuk
-- siswa di kelasnya sendiri.
drop policy if exists "Kelola nilai_ujian_sekolah" on nilai_ujian_sekolah;
create policy "Kelola nilai_ujian_sekolah"
  on nilai_ujian_sekolah for all
  to authenticated
  using (
    current_user_role() in ('admin', 'kepala_sekolah')
    or exists (
      select 1 from user_module_access uma
      where uma.user_id = auth.uid()
        and uma.module = 'nilai_ujian_sekolah'
        and uma.can_edit
    )
    or exists (
      select 1 from wali_kelas wk
      join siswa01 s on s.rombel = wk.rombel
      where wk.gtk_id = current_user_gtk_id()
        and s.nisn = nilai_ujian_sekolah.nisn
    )
  )
  with check (
    current_user_role() in ('admin', 'kepala_sekolah')
    or exists (
      select 1 from user_module_access uma
      where uma.user_id = auth.uid()
        and uma.module = 'nilai_ujian_sekolah'
        and uma.can_edit
    )
    or exists (
      select 1 from wali_kelas wk
      join siswa01 s on s.rombel = wk.rombel
      where wk.gtk_id = current_user_gtk_id()
        and s.nisn = nilai_ujian_sekolah.nisn
    )
  );
