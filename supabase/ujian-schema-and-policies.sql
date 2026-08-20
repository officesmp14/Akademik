-- =====================================================================
-- Modul Ujian Online
-- Jalankan di Supabase -> SQL Editor. Skema ini dipakai bareng oleh
-- siswa-app (dashboard guru: kelola ujian) dan siswa-ujian (situs siswa
-- mengerjakan ujian). Siswa TIDAK punya akun Supabase Auth -- semua akses
-- dari sisi siswa-ujian lewat service role key di server, bukan RLS.
-- =====================================================================

create table if not exists ujian (
  id uuid primary key default gen_random_uuid(),
  judul varchar not null,
  mapel varchar,
  durasi_menit integer not null default 60,
  acak_soal boolean not null default true,
  status varchar(10) not null default 'draft' check (status in ('draft','terbit','arsip')),
  dibuat_oleh uuid references datagtk(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists ujian_soal (
  id uuid primary key default gen_random_uuid(),
  ujian_id uuid not null references ujian(id) on delete cascade,
  urutan integer not null default 0,
  tipe varchar(15) not null check (tipe in ('pilihan_ganda','esai')),
  pertanyaan text not null,
  opsi jsonb,
  kunci_jawaban varchar(1),
  bobot numeric not null default 1,
  created_at timestamptz default now()
);

create table if not exists ujian_sesi (
  id uuid primary key default gen_random_uuid(),
  ujian_id uuid not null references ujian(id) on delete cascade,
  kode_sesi varchar(8) not null unique,
  rombel varchar,
  status varchar(10) not null default 'tertutup' check (status in ('tertutup','dibuka','ditutup')),
  dibuka_pada timestamptz,
  ditutup_pada timestamptz,
  created_at timestamptz default now()
);

create table if not exists ujian_peserta (
  id uuid primary key default gen_random_uuid(),
  sesi_id uuid not null references ujian_sesi(id) on delete cascade,
  siswa_id uuid references siswa01(id) on delete set null,
  nisn varchar not null,
  nama_siswa varchar not null,
  token_peserta varchar(64) not null unique,
  status varchar(15) not null default 'belum_mulai' check (status in ('belum_mulai','mengerjakan','selesai','digugurkan')),
  jumlah_pelanggaran integer not null default 0,
  waktu_mulai timestamptz,
  waktu_selesai timestamptz,
  nilai_pg numeric,
  nilai_esai numeric,
  created_at timestamptz default now(),
  unique (sesi_id, nisn)
);

create table if not exists ujian_jawaban (
  id uuid primary key default gen_random_uuid(),
  peserta_id uuid not null references ujian_peserta(id) on delete cascade,
  soal_id uuid not null references ujian_soal(id) on delete cascade,
  jawaban_pg varchar(1),
  jawaban_esai text,
  is_benar boolean,
  nilai_esai numeric,
  updated_at timestamptz default now(),
  unique (peserta_id, soal_id)
);

create table if not exists ujian_pelanggaran (
  id uuid primary key default gen_random_uuid(),
  peserta_id uuid not null references ujian_peserta(id) on delete cascade,
  tipe varchar(20) not null check (tipe in ('keluar_fullscreen','tab_switch','blur','copy_paste','devtools','lainnya')),
  detail text,
  created_at timestamptz default now()
);

alter table ujian enable row level security;
alter table ujian_soal enable row level security;
alter table ujian_sesi enable row level security;
alter table ujian_peserta enable row level security;
alter table ujian_jawaban enable row level security;
alter table ujian_pelanggaran enable row level security;

-- =====================================================================
-- ujian / ujian_soal / ujian_sesi: dikelola guru lewat siswa-app.
-- Permisif untuk authenticated, konsisten dengan pola tabel lain di
-- proyek ini (lihat jadwal_kombel.sql) -- tombol UI yang membatasi siapa
-- boleh apa, bukan RLS.
-- =====================================================================

drop policy if exists "Authenticated users can view ujian" on ujian;
create policy "Authenticated users can view ujian"
  on ujian for select to authenticated using (true);
drop policy if exists "Authenticated users can insert ujian" on ujian;
create policy "Authenticated users can insert ujian"
  on ujian for insert to authenticated with check (true);
drop policy if exists "Authenticated users can update ujian" on ujian;
create policy "Authenticated users can update ujian"
  on ujian for update to authenticated using (true) with check (true);
drop policy if exists "Authenticated users can delete ujian" on ujian;
create policy "Authenticated users can delete ujian"
  on ujian for delete to authenticated using (true);

drop policy if exists "Authenticated users can view ujian_soal" on ujian_soal;
create policy "Authenticated users can view ujian_soal"
  on ujian_soal for select to authenticated using (true);
drop policy if exists "Authenticated users can insert ujian_soal" on ujian_soal;
create policy "Authenticated users can insert ujian_soal"
  on ujian_soal for insert to authenticated with check (true);
drop policy if exists "Authenticated users can update ujian_soal" on ujian_soal;
create policy "Authenticated users can update ujian_soal"
  on ujian_soal for update to authenticated using (true) with check (true);
drop policy if exists "Authenticated users can delete ujian_soal" on ujian_soal;
create policy "Authenticated users can delete ujian_soal"
  on ujian_soal for delete to authenticated using (true);

drop policy if exists "Authenticated users can view ujian_sesi" on ujian_sesi;
create policy "Authenticated users can view ujian_sesi"
  on ujian_sesi for select to authenticated using (true);
drop policy if exists "Authenticated users can insert ujian_sesi" on ujian_sesi;
create policy "Authenticated users can insert ujian_sesi"
  on ujian_sesi for insert to authenticated with check (true);
drop policy if exists "Authenticated users can update ujian_sesi" on ujian_sesi;
create policy "Authenticated users can update ujian_sesi"
  on ujian_sesi for update to authenticated using (true) with check (true);
drop policy if exists "Authenticated users can delete ujian_sesi" on ujian_sesi;
create policy "Authenticated users can delete ujian_sesi"
  on ujian_sesi for delete to authenticated using (true);

-- =====================================================================
-- ujian_peserta / ujian_jawaban / ujian_pelanggaran: sisi siswa.
-- SENGAJA tidak ada policy untuk role "anon" -- siswa-ujian mengakses
-- tabel-tabel ini HANYA lewat service role key di Route Handler server,
-- tervalidasi oleh token_peserta di cookie, bukan lewat RLS. Guru di
-- siswa-app hanya perlu SELECT (dan UPDATE nilai_esai) lewat akun
-- authenticated biasa.
-- =====================================================================

drop policy if exists "Authenticated users can view ujian_peserta" on ujian_peserta;
create policy "Authenticated users can view ujian_peserta"
  on ujian_peserta for select to authenticated using (true);
-- Guru boleh mengubah status peserta secara manual (mis. tombol
-- "Gugurkan Peserta" di halaman sesi).
drop policy if exists "Authenticated users can update ujian_peserta status" on ujian_peserta;
create policy "Authenticated users can update ujian_peserta status"
  on ujian_peserta for update to authenticated using (true) with check (true);

drop policy if exists "Authenticated users can view ujian_jawaban" on ujian_jawaban;
create policy "Authenticated users can view ujian_jawaban"
  on ujian_jawaban for select to authenticated using (true);
drop policy if exists "Authenticated users can update ujian_jawaban nilai" on ujian_jawaban;
create policy "Authenticated users can update ujian_jawaban nilai"
  on ujian_jawaban for update to authenticated using (true) with check (true);

drop policy if exists "Authenticated users can view ujian_pelanggaran" on ujian_pelanggaran;
create policy "Authenticated users can view ujian_pelanggaran"
  on ujian_pelanggaran for select to authenticated using (true);
