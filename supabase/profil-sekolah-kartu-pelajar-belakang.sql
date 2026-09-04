-- =====================================================================
-- Template kartu pelajar ternyata ada 2 sisi (depan & belakang).
-- Ganti nama kolom yang sudah ada jadi eksplisit "depan", tambah kolom
-- baru untuk sisi belakang. Ditulis aman dijalankan baik migrasi
-- profil-sekolah-kepsek-dan-kartu-pelajar.sql sebelumnya sudah pernah
-- dijalankan maupun belum.
-- Jalankan di Supabase -> SQL Editor.
-- =====================================================================

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'profil_sekolah' and column_name = 'template_kartu_pelajar_url'
  ) then
    alter table profil_sekolah rename column template_kartu_pelajar_url to template_kartu_pelajar_depan_url;
  end if;
end $$;

alter table profil_sekolah add column if not exists template_kartu_pelajar_depan_url text;
alter table profil_sekolah add column if not exists template_kartu_pelajar_belakang_url text;
