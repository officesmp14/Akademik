-- =====================================================================
-- Pendaftaran Siswa Ekstrakurikuler -- siswa mana ikut ekstrakurikuler
-- apa, per tahun ajaran & semester, beserta guru pembinanya saat itu
-- (disimpan sendiri di sini, bukan cuma dilihat dari ketua_ekskul,
-- supaya riwayat tetap benar walau ketua ekskul berganti di kemudian
-- hari).
-- Jalankan di Supabase -> SQL Editor.
-- =====================================================================

create table if not exists siswa_ekskul (
  id uuid primary key default gen_random_uuid(),
  tahun_ajaran varchar not null,
  semester varchar not null check (semester in ('Ganjil', 'Genap')),
  siswa_id uuid not null references siswa01(id) on delete cascade,
  ekskul_kode integer not null references ref_ekstrakurikuler(kode) on delete cascade,
  gtk_id uuid references datagtk(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (tahun_ajaran, semester, siswa_id, ekskul_kode)
);

alter table siswa_ekskul enable row level security;

-- Semua user login boleh lihat (dipakai buat rekap/laporan nantinya).
drop policy if exists "Authenticated users can view siswa_ekskul" on siswa_ekskul;
create policy "Authenticated users can view siswa_ekskul"
  on siswa_ekskul for select
  to authenticated
  using (true);

drop policy if exists "Admin manage siswa_ekskul" on siswa_ekskul;
create policy "Admin manage siswa_ekskul"
  on siswa_ekskul for all
  to authenticated
  using (current_user_role() = 'admin')
  with check (current_user_role() = 'admin');

drop policy if exists "Kepala sekolah manage siswa_ekskul" on siswa_ekskul;
create policy "Kepala sekolah manage siswa_ekskul"
  on siswa_ekskul for all
  to authenticated
  using (current_user_role() = 'kepala_sekolah')
  with check (current_user_role() = 'kepala_sekolah');

-- Guru yang jadi ketua ekskul tertentu boleh kelola pendaftaran siswa
-- untuk ekskul itu saja (bukan ekskul lain).
drop policy if exists "Ketua ekskul manage own siswa_ekskul" on siswa_ekskul;
create policy "Ketua ekskul manage own siswa_ekskul"
  on siswa_ekskul for all
  to authenticated
  using (
    exists (
      select 1 from ketua_ekskul ke
      where ke.ekskul_kode = siswa_ekskul.ekskul_kode
        and ke.gtk_id = current_user_gtk_id()
    )
  )
  with check (
    exists (
      select 1 from ketua_ekskul ke
      where ke.ekskul_kode = siswa_ekskul.ekskul_kode
        and ke.gtk_id = current_user_gtk_id()
    )
  );
