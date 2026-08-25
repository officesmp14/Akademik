-- =====================================================================
-- Tabel Presensi Siswa (per jam pelajaran/mapel, mirip pola tabel nilai)
-- Satu baris = kehadiran 1 siswa untuk 1 mapel di 1 rombel pada 1 tanggal.
-- Jalankan di Supabase -> SQL Editor.
-- =====================================================================

create table if not exists presensi (
  id uuid primary key default gen_random_uuid(),
  siswa_id uuid not null references siswa01(id) on delete cascade,
  gtk_id uuid not null references datagtk(id),
  mapel_id integer not null references pelajaran(id),
  rombel varchar not null,
  tanggal date not null,
  status varchar(1) not null check (status in ('H', 'S', 'I', 'A','L','M','P','G')),
  keterangan text,
  tahun_ajaran varchar not null,
  semester varchar not null check (semester in ('Ganjil', 'Genap')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (siswa_id, mapel_id, rombel, tanggal)
);

alter table presensi enable row level security;

-- =====================================================================
-- RLS -- pola disamakan persis dengan tabel nilai:
-- admin akses penuh, kepala sekolah & wali kelas cuma lihat, guru cuma
-- kelola presensi untuk kelas/mapel yang memang jadi penugasan mengajarnya
-- (dicek lewat guru_mengajar_kelas).
-- =====================================================================

drop policy if exists "Admin manage presensi" on presensi;
create policy "Admin manage presensi"
  on presensi for all
  to authenticated
  using (current_user_role() = 'admin')
  with check (current_user_role() = 'admin');

drop policy if exists "Kepala sekolah view presensi" on presensi;
create policy "Kepala sekolah view presensi"
  on presensi for select
  to authenticated
  using (current_user_role() = 'kepala_sekolah');

drop policy if exists "Wali kelas view presensi kelasnya" on presensi;
create policy "Wali kelas view presensi kelasnya"
  on presensi for select
  to authenticated
  using (
    exists (
      select 1
      from wali_kelas wk
      where wk.gtk_id = current_user_gtk_id()
        and (wk.rombel)::text = (presensi.rombel)::text
    )
  );

drop policy if exists "Guru manage own presensi" on presensi;
create policy "Guru manage own presensi"
  on presensi for all
  to authenticated
  using (
    gtk_id = current_user_gtk_id()
    and exists (
      select 1
      from guru_mengajar_kelas gmk
      where gmk.gtk_id = presensi.gtk_id
        and gmk.mapel_id = presensi.mapel_id
        and (gmk.rombel)::text = (presensi.rombel)::text
    )
  )
  with check (
    gtk_id = current_user_gtk_id()
    and exists (
      select 1
      from guru_mengajar_kelas gmk
      where gmk.gtk_id = presensi.gtk_id
        and gmk.mapel_id = presensi.mapel_id
        and (gmk.rombel)::text = (presensi.rombel)::text
    )
  );
