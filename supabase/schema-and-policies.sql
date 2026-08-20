-- =====================================================================
-- PERBAIKAN SKEMA: fix bug pada CHECK constraint status_siswa
-- (constraint asli mereferensikan kolom "status_alumni" yang tidak ada,
--  sehingga CREATE TABLE aslinya akan gagal / perlu diperbaiki)
-- =====================================================================

-- Jika tabel BELUM pernah berhasil dibuat, jalankan ulang dengan versi
-- yang sudah diperbaiki ini:
create table if not exists siswa01 (
  id uuid primary key default gen_random_uuid(),
  row_index integer unique,
  tahun_masuk varchar,
  semester varchar,
  nama varchar,
  nipd varchar,
  jk varchar(1) check (jk in ('L','P')),
  nisn varchar,
  tempat_lahir varchar,
  tanggal_lahir date,
  nik varchar,
  agama varchar,
  anak_ke varchar,
  sekolah_asal varchar,
  kebutuhan_khusus varchar,
  alamat varchar,
  rt varchar,
  rw varchar,
  dusun varchar,
  kelurahan varchar,
  kecamatan varchar,
  kode_pos varchar,
  jenis_tinggal varchar,
  alat_transportasi varchar,
  lintang varchar,
  bujur varchar,
  jarak_rumah varchar,
  jarak_tempuh varchar,
  telepon varchar,
  hp varchar,
  email varchar,
  nama_ayah varchar,
  ayah_tahun_lahir varchar,
  ayah_nik varchar,
  ayah_pendidikan varchar,
  ayah_pekerjaan varchar,
  ayah_penghasilan varchar,
  nama_ibu varchar,
  ibu_tahun_lahir varchar,
  ibu_nik varchar,
  ibu_pendidikan varchar,
  ibu_pekerjaan varchar,
  ibu_penghasilan varchar,
  nama_wali varchar,
  wali_tahun_lahir varchar,
  wali_nik varchar,
  wali_pendidikan varchar,
  wali_pekerjaan varchar,
  wali_penghasilan varchar,
  rombel varchar,
  no_peserta_un varchar,
  no_seri_ijazah varchar,
  skhun varchar,
  penerima_kps varchar(1) check (penerima_kps in ('Y','N')),
  no_kps varchar,
  penerima_kip varchar(1) check (penerima_kip in ('Y','N')),
  nomor_kip varchar,
  nama_kip varchar,
  nomor_kks varchar,
  layak_pip varchar(1) check (layak_pip in ('Y','N')),
  alasan_pip text,
  no_akta_lahir varchar,
  no_kk varchar,
  bank varchar,
  no_rekening varchar,
  rekening_atas_nama varchar,
  berat_badan varchar,
  tinggi_badan varchar,
  lingkar_kepala varchar,
  jml_saudara varchar,
  jalur varchar,
  status_siswa varchar(10) check (status_siswa in ('Aktif','Mutasi','Alumni','Berhenti')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table siswa01 enable row level security;

-- Jika tabel SUDAH terlanjur ada (berhasil dibuat tanpa constraint di atas
-- karena Postgres mengabaikannya, atau Anda ingin memastikan constraint benar),
-- jalankan ini untuk memperbaiki constraint yang salah referensi kolom:
--
-- alter table siswa01 drop constraint if exists siswa01_status_siswa_check;
-- alter table siswa01 add constraint siswa01_status_siswa_check
--   check (status_siswa in ('Aktif','Mutasi','Alumni','Berhenti'));

-- =====================================================================
-- ROW LEVEL SECURITY POLICIES
-- RLS sudah di-enable di atas. Tanpa policy, TIDAK ADA yang bisa
-- mengakses tabel ini sama sekali (termasuk admin yang login).
-- Policy di bawah mengizinkan setiap user yang SUDAH LOGIN (authenticated)
-- untuk melakukan select/insert/update/delete.
-- =====================================================================

drop policy if exists "Authenticated users can view siswa" on siswa01;
create policy "Authenticated users can view siswa"
  on siswa01 for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can insert siswa" on siswa01;
create policy "Authenticated users can insert siswa"
  on siswa01 for insert
  to authenticated
  with check (true);

drop policy if exists "Authenticated users can update siswa" on siswa01;
create policy "Authenticated users can update siswa"
  on siswa01 for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Authenticated users can delete siswa" on siswa01;
create policy "Authenticated users can delete siswa"
  on siswa01 for delete
  to authenticated
  using (true);
