-- =====================================================================
-- Pengaturan SKL -- bobot Nilai Raport (kelas 7-9, 6 semester) dan Nilai
-- Ujian Sekolah (Tertulis + Praktik) untuk perhitungan nilai akhir SKL.
-- Satu baris singleton (id selalu 1), sama seperti pengaturan_bobot_nilai
-- dan pengaturan_akademik.
-- Jalankan di Supabase -> SQL Editor.
-- =====================================================================

create table if not exists pengaturan_skl (
  id int primary key default 1,
  bobot_rapor numeric not null default 70,
  bobot_ujian_sekolah numeric not null default 30,
  tanggal_cetak_skl date,
  updated_at timestamptz default now(),
  constraint pengaturan_skl_single_row check (id = 1)
);

alter table pengaturan_skl add column if not exists tanggal_cetak_skl date;

insert into pengaturan_skl (id, bobot_rapor, bobot_ujian_sekolah)
values (1, 70, 30)
on conflict (id) do nothing;

alter table pengaturan_skl enable row level security;

drop policy if exists "Authenticated users can view pengaturan_skl" on pengaturan_skl;
create policy "Authenticated users can view pengaturan_skl"
  on pengaturan_skl for select
  to authenticated
  using (true);

-- Cuma admin/kepala sekolah yang boleh ubah bobot -- ini keputusan
-- kebijakan sekolah, bukan sesuatu yang didelegasikan lewat Hak Akses.
drop policy if exists "Admin kelola pengaturan_skl" on pengaturan_skl;
create policy "Admin kelola pengaturan_skl"
  on pengaturan_skl for all
  to authenticated
  using (current_user_role() in ('admin', 'kepala_sekolah'))
  with check (current_user_role() in ('admin', 'kepala_sekolah'));
