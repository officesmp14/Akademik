-- =====================================================================
-- Nilai Leger -- SATU baris per siswa per tahun ajaran & semester, satu
-- kolom per mata pelajaran + ketidakhadiran, persis bentuk leger e-Rapor
-- Kemendikbud (bukan dihitung dari tabel `nilai` internal aplikasi ini).
--
-- Kunci penghubung ke siswa01 pakai NISN (lihat
-- src/lib/nilai-leger-import.ts untuk pencocokan saat import).
--
-- File ini AMAN dijalankan ulang kapan saja. Kalau tabel masih berbentuk
-- lama (satu baris per mapel: kolom mapel_id + nilai), datanya dipivot
-- otomatis ke bentuk baru (satu baris per siswa, banyak kolom mapel)
-- sebelum kolom lama dihapus -- tidak ada data yang hilang.
-- Jalankan di Supabase -> SQL Editor.
-- =====================================================================

create table if not exists nilai_leger (
  id uuid primary key default gen_random_uuid(),
  nisn varchar not null,
  tahun_ajaran varchar not null,
  semester varchar not null check (semester in ('Ganjil', 'Genap')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Drop dulu policy lama (kalau ada) SEBELUM ubah kolom -- policy versi
-- sebelumnya merujuk ke kolom lama, jadi kolom itu tidak bisa dihapus
-- selama policy itu masih ada ("depends on column ...").
drop policy if exists "Authenticated users can view nilai_leger" on nilai_leger;
drop policy if exists "Kelola nilai_leger" on nilai_leger;

-- Kolom nilai per mapel + ketidakhadiran (semua nullable -- leger tidak
-- selalu terisi penuh, mis. siswa cuma punya 1 dari 4 kolom agama).
alter table nilai_leger add column if not exists islam numeric;
alter table nilai_leger add column if not exists kristen numeric;
alter table nilai_leger add column if not exists katolik numeric;
alter table nilai_leger add column if not exists budha numeric;
alter table nilai_leger add column if not exists pkn numeric;
alter table nilai_leger add column if not exists bind numeric;
alter table nilai_leger add column if not exists mtk numeric;
alter table nilai_leger add column if not exists ipa numeric;
alter table nilai_leger add column if not exists ips numeric;
alter table nilai_leger add column if not exists bing numeric;
alter table nilai_leger add column if not exists pjok numeric;
alter table nilai_leger add column if not exists infor numeric;
alter table nilai_leger add column if not exists prakarya numeric;
alter table nilai_leger add column if not exists sakit integer;
alter table nilai_leger add column if not exists izin integer;
alter table nilai_leger add column if not exists alpa integer;

-- Kelas siswa itu PADA SAAT nilai ini dicatat (bisa beda dari rombel
-- siswa01 sekarang kalau sudah naik kelas) -- mis. "VII.1". Nullable
-- (bukan not null) karena ini konteks tambahan, bukan bagian dari kunci
-- baris, dan data lama/hasil pivot belum tentu tahu kelasnya saat itu.
alter table nilai_leger add column if not exists kelas_old varchar;

-- NISN harus unik di siswa01 supaya bisa jadi target foreign key.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'siswa01_nisn_unique') then
    alter table siswa01 add constraint siswa01_nisn_unique unique (nisn);
  end if;
end $$;

alter table nilai_leger drop constraint if exists nilai_leger_nisn_fkey;
alter table nilai_leger
  add constraint nilai_leger_nisn_fkey foreign key (nisn) references siswa01(nisn) on delete cascade;

-- Constraint unik baru (satu baris per siswa per periode) dibuat SEBELUM
-- pivot data lama, supaya bisa dipakai sebagai target ON CONFLICT di
-- bawah.
alter table nilai_leger drop constraint if exists nilai_leger_nisn_mapel_id_tahun_ajaran_semester_key;
alter table nilai_leger drop constraint if exists nilai_leger_nisn_tahun_ajaran_semester_key;
alter table nilai_leger
  add constraint nilai_leger_nisn_tahun_ajaran_semester_key unique (nisn, tahun_ajaran, semester);

-- Migrasi dari skema lama (satu baris per mapel: mapel_id + nilai) kalau
-- masih ada -- pivot jadi satu baris per siswa, lalu hapus baris lama.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'nilai_leger' and column_name = 'mapel_id'
  ) then
    insert into nilai_leger (nisn, tahun_ajaran, semester, islam, kristen, katolik, budha, pkn, bind, mtk, ipa, ips, bing, pjok, infor, prakarya)
    select
      nisn, tahun_ajaran, semester,
      max(case when mapel_id = 1 then nilai end),
      max(case when mapel_id = 2 then nilai end),
      max(case when mapel_id = 3 then nilai end),
      max(case when mapel_id = 5 then nilai end),
      max(case when mapel_id = 7 then nilai end),
      max(case when mapel_id = 8 then nilai end),
      max(case when mapel_id = 9 then nilai end),
      max(case when mapel_id = 10 then nilai end),
      max(case when mapel_id = 11 then nilai end),
      max(case when mapel_id = 12 then nilai end),
      max(case when mapel_id = 13 then nilai end),
      max(case when mapel_id = 16 then nilai end),
      max(case when mapel_id = 15 then nilai end)
    from nilai_leger
    where mapel_id is not null
    group by nisn, tahun_ajaran, semester
    on conflict (nisn, tahun_ajaran, semester) do update set
      islam = excluded.islam, kristen = excluded.kristen, katolik = excluded.katolik,
      budha = excluded.budha, pkn = excluded.pkn, bind = excluded.bind, mtk = excluded.mtk,
      ipa = excluded.ipa, ips = excluded.ips, bing = excluded.bing, pjok = excluded.pjok,
      infor = excluded.infor, prakarya = excluded.prakarya;

    delete from nilai_leger where mapel_id is not null;

    alter table nilai_leger drop constraint if exists nilai_leger_mapel_id_fkey;
    alter table nilai_leger drop column mapel_id;
    alter table nilai_leger drop column if exists nilai;
  end if;
end $$;

-- Isi kelas_old yang masih kosong (baris lama dari sebelum kolom ini ada)
-- pakai rombel siswa SEKARANG sebagai perkiraan -- lebih baik daripada
-- kosong, walau tidak selalu 100% sama dengan kelasnya saat nilai itu
-- dicatat kalau siswanya sudah pindah kelas sejak itu.
update nilai_leger nl
set kelas_old = s.rombel
from siswa01 s
where s.nisn = nl.nisn
  and nl.kelas_old is null
  and s.rombel is not null;

alter table nilai_leger enable row level security;

create policy "Authenticated users can view nilai_leger"
  on nilai_leger for select
  to authenticated
  using (true);

-- Boleh input/ubah/hapus kalau: admin/kepala sekolah, ATAU diberi hak
-- akses modul 'nilai_leger' lewat Hak Akses (staf kurikulum), ATAU wali
-- kelas untuk siswa di kelasnya sendiri.
create policy "Kelola nilai_leger"
  on nilai_leger for all
  to authenticated
  using (
    current_user_role() in ('admin', 'kepala_sekolah')
    or exists (
      select 1 from user_module_access uma
      where uma.user_id = auth.uid()
        and uma.module = 'nilai_leger'
        and uma.can_edit
    )
    or exists (
      select 1 from wali_kelas wk
      join siswa01 s on s.rombel = wk.rombel
      where wk.gtk_id = current_user_gtk_id()
        and s.nisn = nilai_leger.nisn
    )
  )
  with check (
    current_user_role() in ('admin', 'kepala_sekolah')
    or exists (
      select 1 from user_module_access uma
      where uma.user_id = auth.uid()
        and uma.module = 'nilai_leger'
        and uma.can_edit
    )
    or exists (
      select 1 from wali_kelas wk
      join siswa01 s on s.rombel = wk.rombel
      where wk.gtk_id = current_user_gtk_id()
        and s.nisn = nilai_leger.nisn
    )
  );
