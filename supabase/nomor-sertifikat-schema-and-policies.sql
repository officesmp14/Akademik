-- =====================================================================
-- Nomor Sertifikat Berprestasi -- nomor sertifikat untuk 3 besar tiap
-- kelas IX (sama seperti halaman Peringkat), formatnya sama dengan Nomor
-- Unik SKL: "{kode_klasifikasi_skl}/{nomor_unik}/{kode_sekolah_skl}/
-- {tahun akhir tahun ajaran}". Disimpan di tabel terpisah (bukan kolom
-- siswa01.no_seri_ijazah) supaya nomor tiap tahun ajaran tetap tersimpan
-- terpisah dan tidak saling menimpa saat digenerate ulang tahun berikutnya.
-- Jalankan di Supabase -> SQL Editor.
-- =====================================================================

alter table pengaturan_skl add column if not exists nomor_awal_sertifikat int;

create table if not exists nomor_sertifikat (
  id uuid primary key default gen_random_uuid(),
  nisn text not null,
  tahun_ajaran text not null,
  nomor_unik int not null,
  updated_at timestamptz default now(),
  unique (nisn, tahun_ajaran)
);

alter table nomor_sertifikat enable row level security;

-- Sama seperti nomor_unik_skl: semua yang login boleh lihat (dipakai di
-- Cetak Sertifikat nantinya), tapi cuma admin/kepala sekolah yang boleh
-- generate/ubah nomornya.
drop policy if exists "Authenticated users can view nomor_sertifikat" on nomor_sertifikat;
create policy "Authenticated users can view nomor_sertifikat"
  on nomor_sertifikat for select
  to authenticated
  using (true);

drop policy if exists "Admin kelola nomor_sertifikat" on nomor_sertifikat;
create policy "Admin kelola nomor_sertifikat"
  on nomor_sertifikat for all
  to authenticated
  using (current_user_role() in ('admin', 'kepala_sekolah'))
  with check (current_user_role() in ('admin', 'kepala_sekolah'));
