-- =====================================================================
-- Nomor Unik SKL -- nomor surat resmi per siswa kelas IX, formatnya:
-- "{kode_klasifikasi_skl}/{nomor_unik}/{kode_sekolah_skl}/{tahun akhir
-- tahun ajaran}", misalnya "400.3.11/124/SMPN.14/2026". Bagian
-- kode_klasifikasi_skl & kode_sekolah_skl disimpan di pengaturan_skl
-- (satu untuk semua siswa), sedangkan nomor_unik berbeda per siswa dan
-- di-generate otomatis secara berurutan (per kelas) mulai dari nomor
-- awal yang diinput admin/kepala sekolah.
-- Jalankan di Supabase -> SQL Editor.
-- =====================================================================

alter table pengaturan_skl add column if not exists kode_klasifikasi_skl text not null default '400.3.11';
alter table pengaturan_skl add column if not exists kode_sekolah_skl text not null default 'SMPN.14';
alter table pengaturan_skl add column if not exists nomor_awal_skl int;

create table if not exists nomor_unik_skl (
  id uuid primary key default gen_random_uuid(),
  nisn text not null,
  tahun_ajaran text not null,
  nomor_unik int not null,
  updated_at timestamptz default now(),
  unique (nisn, tahun_ajaran)
);

alter table nomor_unik_skl enable row level security;

-- Sama seperti pengaturan_skl: semua yang login boleh lihat (dipakai di
-- Cetak Nilai Ijazah dkk nantinya), tapi cuma admin/kepala sekolah yang
-- boleh generate/ubah nomornya -- ini nomor surat resmi, bukan sesuatu
-- yang didelegasikan lewat Hak Akses seperti modul lain.
drop policy if exists "Authenticated users can view nomor_unik_skl" on nomor_unik_skl;
create policy "Authenticated users can view nomor_unik_skl"
  on nomor_unik_skl for select
  to authenticated
  using (true);

drop policy if exists "Admin kelola nomor_unik_skl" on nomor_unik_skl;
create policy "Admin kelola nomor_unik_skl"
  on nomor_unik_skl for all
  to authenticated
  using (current_user_role() in ('admin', 'kepala_sekolah'))
  with check (current_user_role() in ('admin', 'kepala_sekolah'));
