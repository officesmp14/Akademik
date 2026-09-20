-- =====================================================================
-- Nilai SKL (komponen Ujian Sekolah) -- hasil AVERAGE(Tertulis, Praktik) x
-- (pengaturan_skl.bobot_ujian_sekolah / 100) per mapel per siswa, disimpan
-- supaya proses berikutnya (gabung dengan komponen Nilai Raport jadi Nilai
-- SKL akhir) tidak perlu hitung ulang dari nilai_ujian_sekolah tiap saat.
-- Dihitung ulang & di-upsert otomatis oleh halaman /nilai-ujian-sekolah
-- setiap kali datanya berubah -- satu baris per (nisn, tahun_ajaran).
-- Jalankan di Supabase -> SQL Editor.
-- =====================================================================

create table if not exists nilai_skl_ujian_sekolah (
  id uuid primary key default gen_random_uuid(),
  nisn varchar not null,
  tahun_ajaran varchar not null,
  agama numeric,
  pkn numeric,
  bind numeric,
  mtk numeric,
  ipa numeric,
  ips numeric,
  bing numeric,
  pjok numeric,
  prakarya numeric,
  informatika numeric,
  updated_at timestamptz default now()
);

alter table nilai_skl_ujian_sekolah drop constraint if exists nilai_skl_ujian_sekolah_nisn_fkey;
alter table nilai_skl_ujian_sekolah
  add constraint nilai_skl_ujian_sekolah_nisn_fkey foreign key (nisn) references siswa01(nisn) on delete cascade;

alter table nilai_skl_ujian_sekolah drop constraint if exists nilai_skl_ujian_sekolah_nisn_tahun_ajaran_key;
alter table nilai_skl_ujian_sekolah
  add constraint nilai_skl_ujian_sekolah_nisn_tahun_ajaran_key unique (nisn, tahun_ajaran);

alter table nilai_skl_ujian_sekolah enable row level security;

drop policy if exists "Authenticated users can view nilai_skl_ujian_sekolah" on nilai_skl_ujian_sekolah;
create policy "Authenticated users can view nilai_skl_ujian_sekolah"
  on nilai_skl_ujian_sekolah for select
  to authenticated
  using (true);

-- Sama seperti nilai_ujian_sekolah -- yang boleh menulis di sini adalah
-- siapa pun yang boleh mengisi nilai ujian sekolah itu sendiri, karena
-- tabel ini cuma hasil hitung otomatis darinya.
drop policy if exists "Kelola nilai_skl_ujian_sekolah" on nilai_skl_ujian_sekolah;
create policy "Kelola nilai_skl_ujian_sekolah"
  on nilai_skl_ujian_sekolah for all
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
        and s.nisn = nilai_skl_ujian_sekolah.nisn
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
        and s.nisn = nilai_skl_ujian_sekolah.nisn
    )
  );
