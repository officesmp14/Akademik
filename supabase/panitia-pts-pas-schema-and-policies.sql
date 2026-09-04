-- =====================================================================
-- Panitia PTS (Penilaian Tengah Semester) & PAS (Penilaian Akhir
-- Semester) -- ketua panitia & sekretaris, per tahun ajaran & semester.
-- Satu baris per (tahun_ajaran, semester, jenis).
-- Jalankan di Supabase -> SQL Editor.
-- =====================================================================

create table if not exists panitia_pts_pas (
  id uuid primary key default gen_random_uuid(),
  tahun_ajaran varchar not null,
  semester varchar not null check (semester in ('Ganjil', 'Genap')),
  jenis varchar not null check (jenis in ('PTS', 'PAS')),
  ketua_gtk_id uuid references datagtk(id) on delete set null,
  sekretaris_gtk_id uuid references datagtk(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (tahun_ajaran, semester, jenis)
);

alter table panitia_pts_pas enable row level security;

-- Permisif untuk authenticated, konsisten dengan pola tabel penugasan lain
-- di proyek ini (wali_kelas, ketua_ekskul, jadwal_kombel) -- tombol UI yang
-- membatasi ke admin, bukan RLS.
drop policy if exists "Authenticated users can view panitia_pts_pas" on panitia_pts_pas;
create policy "Authenticated users can view panitia_pts_pas"
  on panitia_pts_pas for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can manage panitia_pts_pas" on panitia_pts_pas;
create policy "Authenticated users can manage panitia_pts_pas"
  on panitia_pts_pas for all
  to authenticated
  using (true)
  with check (true);
