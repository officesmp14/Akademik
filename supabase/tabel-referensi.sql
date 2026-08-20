-- =====================================================================
-- Tabel Referensi (kode, uraian) -- Cita-cita, Hobi, Penghasilan,
-- Pekerjaan, Jenjang Pendidikan, Moda Transportasi, Jenis Tinggal, Agama
-- Sumber data: tabel_referensi.xlsx
-- Jalankan di Supabase -> SQL Editor.
-- =====================================================================

-- Tabel Cita-cita
create table if not exists ref_cita_cita (
  kode integer primary key,
  uraian varchar not null
);

alter table ref_cita_cita enable row level security;

drop policy if exists "Authenticated users can view ref_cita_cita" on ref_cita_cita;
create policy "Authenticated users can view ref_cita_cita"
  on ref_cita_cita for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can manage ref_cita_cita" on ref_cita_cita;
create policy "Authenticated users can manage ref_cita_cita"
  on ref_cita_cita for all
  to authenticated
  using (true)
  with check (true);

insert into ref_cita_cita (kode, uraian) values
  (1, 'PNS'),
  (2, 'TNI/Polri'),
  (3, 'Guru/Dosen'),
  (4, 'Dokter'),
  (5, 'Politikus'),
  (6, 'Wiraswasta'),
  (7, 'Seni/Lukis/Artis/Sejenis'),
  (8, 'Lainnya'),
  (11, 'Penghafal Al-Qur''an'),
  (12, 'Atlet E-Sport Profesional'),
  (13, 'Atlet'),
  (14, 'Content Creator'),
  (15, 'Vloger'),
  (16, 'Koki'),
  (17, 'Pendeta'),
  (18, 'Perawat'),
  (19, 'Pilot'),
  (20, 'Pembalap'),
  (21, 'Atlit Olahraga'),
  (22, 'Pengacara'),
  (23, 'Da''i / Ustadz'),
  (24, 'Entertainer / Pekerja Seni'),
  (25, 'Wartawan'),
  (26, 'Pengusaha / Bisnismen'),
  (27, 'Penulis'),
  (28, 'Penyiar Radio'),
  (29, 'Pembawa Acara / Master Ceremony'),
  (30, 'Polisi'),
  (31, 'Pemadam Kebakaran'),
  (32, 'Astronot'),
  (33, 'Masinis Kereta Api'),
  (34, 'Perawat / Suster'),
  (35, 'Bidan'),
  (36, 'Presiden'),
  (37, 'Pegawai Negeri Sipil / PNS'),
  (38, 'Translator'),
  (39, 'Designer'),
  (40, 'Pelaut'),
  (41, 'Arsitek')
on conflict (kode) do update set uraian = excluded.uraian;

-- Tabel Hobi
create table if not exists ref_hobi (
  kode integer primary key,
  uraian varchar not null
);

alter table ref_hobi enable row level security;

drop policy if exists "Authenticated users can view ref_hobi" on ref_hobi;
create policy "Authenticated users can view ref_hobi"
  on ref_hobi for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can manage ref_hobi" on ref_hobi;
create policy "Authenticated users can manage ref_hobi"
  on ref_hobi for all
  to authenticated
  using (true)
  with check (true);

insert into ref_hobi (kode, uraian) values
  (1, 'Olah Raga'),
  (2, 'Kesenian'),
  (3, 'Membaca'),
  (4, 'Menulis'),
  (5, 'Traveling'),
  (6, 'Lainnya'),
  (11, 'Fotografi'),
  (12, 'Fitness'),
  (13, 'Belanja'),
  (14, 'Menggambar'),
  (15, 'Bermain Musik'),
  (16, 'mendaki'),
  (17, 'Jogging'),
  (18, 'Bermain Gitar'),
  (19, 'Bermain Bola'),
  (20, 'Bermain Bulu Tangkis'),
  (21, 'Bermain Bola Tenis'),
  (22, 'Bermain Biola'),
  (23, 'Bermain Piano'),
  (24, 'Berlari'),
  (25, 'Berkemah'),
  (26, 'Memancing'),
  (27, 'Berselancar'),
  (28, 'Bermain Gitar'),
  (29, 'Bermain Boneka'),
  (30, 'Makan'),
  (31, 'Menjahit'),
  (32, 'Main Puzzle'),
  (33, 'Mewarnai')
on conflict (kode) do update set uraian = excluded.uraian;

-- Tabel Penghasilan
create table if not exists ref_penghasilan (
  kode integer primary key,
  uraian varchar not null
);

alter table ref_penghasilan enable row level security;

drop policy if exists "Authenticated users can view ref_penghasilan" on ref_penghasilan;
create policy "Authenticated users can view ref_penghasilan"
  on ref_penghasilan for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can manage ref_penghasilan" on ref_penghasilan;
create policy "Authenticated users can manage ref_penghasilan"
  on ref_penghasilan for all
  to authenticated
  using (true)
  with check (true);

insert into ref_penghasilan (kode, uraian) values
  (11, 'Kurang dari Rp. 500,000'),
  (12, 'Rp. 500,000 - Rp. 999,999'),
  (13, 'Rp. 1,000,000 - Rp. 1,999,999'),
  (14, 'Rp. 2,000,000 - Rp. 4,999,999'),
  (15, 'Rp. 5,000,000 - Rp. 20,000,000'),
  (16, 'Lebih dari Rp. 20,000,000'),
  (99, 'Tidak Berpenghasilan'),
  (17, '< Rp1.000.000'),
  (18, 'Rp1.000.001 - Rp3.000.000')
on conflict (kode) do update set uraian = excluded.uraian;

-- Tabel Pekerjaan
create table if not exists ref_pekerjaan (
  kode integer primary key,
  uraian varchar not null
);

alter table ref_pekerjaan enable row level security;

drop policy if exists "Authenticated users can view ref_pekerjaan" on ref_pekerjaan;
create policy "Authenticated users can view ref_pekerjaan"
  on ref_pekerjaan for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can manage ref_pekerjaan" on ref_pekerjaan;
create policy "Authenticated users can manage ref_pekerjaan"
  on ref_pekerjaan for all
  to authenticated
  using (true)
  with check (true);

insert into ref_pekerjaan (kode, uraian) values
  (1, 'Tidak bekerja'),
  (2, 'Nelayan'),
  (3, 'Petani'),
  (4, 'Peternak'),
  (5, 'PNS/TNI/Polri'),
  (6, 'Karyawan Swasta'),
  (7, 'Pedagang Kecil'),
  (8, 'Pedagang Besar'),
  (9, 'Wiraswasta'),
  (10, 'Wirausaha'),
  (11, 'Buruh'),
  (12, 'Pensiunan'),
  (13, 'Tenaga Kerja Indonesia'),
  (90, 'Tidak dapat diterapkan'),
  (98, 'Sudah Meninggal'),
  (99, 'Lainnya'),
  (14, 'Karyawan BUMN')
on conflict (kode) do update set uraian = excluded.uraian;

-- Tabel Jenjang Pendidikan
create table if not exists ref_jenjang_pendidikan (
  kode integer primary key,
  uraian varchar not null
);

alter table ref_jenjang_pendidikan enable row level security;

drop policy if exists "Authenticated users can view ref_jenjang_pendidikan" on ref_jenjang_pendidikan;
create policy "Authenticated users can view ref_jenjang_pendidikan"
  on ref_jenjang_pendidikan for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can manage ref_jenjang_pendidikan" on ref_jenjang_pendidikan;
create policy "Authenticated users can manage ref_jenjang_pendidikan"
  on ref_jenjang_pendidikan for all
  to authenticated
  using (true)
  with check (true);

insert into ref_jenjang_pendidikan (kode, uraian) values
  (0, 'Tidak sekolah'),
  (1, 'PAUD'),
  (2, 'TK / sederajat'),
  (3, 'Putus SD'),
  (4, 'SD / sederajat'),
  (5, 'SMP / sederajat'),
  (6, 'SMA / sederajat'),
  (7, 'Paket A'),
  (8, 'Paket B'),
  (9, 'Paket C'),
  (20, 'D1'),
  (21, 'D2'),
  (22, 'D3'),
  (23, 'D4'),
  (30, 'S1'),
  (31, 'Profesi'),
  (32, 'Sp-1'),
  (35, 'S2'),
  (36, 'S2 Terapan'),
  (37, 'Sp-2'),
  (40, 'S3'),
  (41, 'S3 Terapan'),
  (90, 'Non formal'),
  (91, 'Informal'),
  (99, 'Lainnya')
on conflict (kode) do update set uraian = excluded.uraian;

-- Tabel Moda Transportasi
create table if not exists ref_moda_transportasi (
  kode integer primary key,
  uraian varchar not null
);

alter table ref_moda_transportasi enable row level security;

drop policy if exists "Authenticated users can view ref_moda_transportasi" on ref_moda_transportasi;
create policy "Authenticated users can view ref_moda_transportasi"
  on ref_moda_transportasi for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can manage ref_moda_transportasi" on ref_moda_transportasi;
create policy "Authenticated users can manage ref_moda_transportasi"
  on ref_moda_transportasi for all
  to authenticated
  using (true)
  with check (true);

insert into ref_moda_transportasi (kode, uraian) values
  (1, 'Jalan kaki'),
  (3, 'Angkutan umum/bus/pete-pete'),
  (4, 'Mobil/bus antar jemput'),
  (5, 'Kereta api'),
  (6, 'Ojek'),
  (7, 'Andong/bendi/sado/dokar/delman/becak'),
  (8, 'Perahu penyeberangan/rakit/getek'),
  (11, 'Kuda'),
  (12, 'Sepeda'),
  (13, 'Sepeda motor'),
  (14, 'Mobil pribadi'),
  (99, 'Lainnya')
on conflict (kode) do update set uraian = excluded.uraian;

-- Tabel Jenis Tinggal
create table if not exists ref_jenis_tinggal (
  kode integer primary key,
  uraian varchar not null
);

alter table ref_jenis_tinggal enable row level security;

drop policy if exists "Authenticated users can view ref_jenis_tinggal" on ref_jenis_tinggal;
create policy "Authenticated users can view ref_jenis_tinggal"
  on ref_jenis_tinggal for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can manage ref_jenis_tinggal" on ref_jenis_tinggal;
create policy "Authenticated users can manage ref_jenis_tinggal"
  on ref_jenis_tinggal for all
  to authenticated
  using (true)
  with check (true);

insert into ref_jenis_tinggal (kode, uraian) values
  (1, 'Bersama orang tua'),
  (2, 'Wali'),
  (3, 'Kost'),
  (4, 'Asrama'),
  (5, 'Panti asuhan'),
  (10, 'Pesantren'),
  (99, 'Lainnya')
on conflict (kode) do update set uraian = excluded.uraian;

-- Tabel Agama
create table if not exists ref_agama (
  kode integer primary key,
  uraian varchar not null
);

alter table ref_agama enable row level security;

drop policy if exists "Authenticated users can view ref_agama" on ref_agama;
create policy "Authenticated users can view ref_agama"
  on ref_agama for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can manage ref_agama" on ref_agama;
create policy "Authenticated users can manage ref_agama"
  on ref_agama for all
  to authenticated
  using (true)
  with check (true);

insert into ref_agama (kode, uraian) values
  (1, 'Islam'),
  (2, 'Kristen'),
  (3, 'Katholik'),
  (4, 'Hindu'),
  (5, 'Budha'),
  (6, 'Khonghucu'),
  (7, 'Kepercayaan kpd Tuhan YME'),
  (99, 'lainnya')
on conflict (kode) do update set uraian = excluded.uraian;

-- Tabel jalur pendaftaran
create table if not exists ref_jalur_daftar (
  kode integer primary key,
  uraian varchar not null
);

alter table ref_jalur_daftar enable row level security;

drop policy if exists "Authenticated users can view ref_jalur_daftar" on ref_jalur_daftar;
create policy "Authenticated users can view ref_jalur_daftar"
  on ref_jalur_daftar for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can manage ref_jalur_daftar" on ref_jalur_daftar;
create policy "Authenticated users can manage ref_jalur_daftar"
  on ref_jalur_daftar for all
  to authenticated
  using (true)
  with check (true);

insert into ref_jalur_daftar (kode, uraian) values
  (1, 'Zonasi'),
  (2, 'Afirmasi'),
  (3, 'Perpindahan'),
  (4, 'Prestasi'),
  (5, 'Mandiri')
on conflict (kode) do update set uraian = excluded.uraian;