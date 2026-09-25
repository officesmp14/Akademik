-- =====================================================================
-- Staf dengan datagtk.jenis_ptk_pdd = Pengadministrasi Perkantoran /
-- Penata Layanan Operasional / Penelaah Teknis Kebijakan boleh MELIHAT
-- (baca saja) menu Data Siswa. Policy RLS siswa01 & prestasi_siswa
-- sebelumnya hanya mengizinkan admin/wali kelas/guru pengampu, jadi
-- tanpa policy ini daftarnya kosong untuk staf.
-- Daftar jenis harus sama dengan src/lib/staf-pdd.ts.
-- Jalankan di Supabase -> SQL Editor.
-- =====================================================================

create or replace function public.is_staf_lihat_siswa()
returns boolean
language sql
stable security definer
set search_path = public
as $function$
  select exists (
    select 1 from datagtk
    where id = current_user_gtk_id()
      and jenis_ptk_pdd in (
        'Pengadministrasi Perkantoran',
        'Penata Layanan Operasional',
        'Penelaah Teknis Kebijakan'
      )
  );
$function$;

drop policy if exists "Staf PDD view semua siswa" on siswa01;
create policy "Staf PDD view semua siswa"
  on siswa01 for select
  to authenticated
  using (is_staf_lihat_siswa());

drop policy if exists "Staf PDD view prestasi_siswa" on prestasi_siswa;
create policy "Staf PDD view prestasi_siswa"
  on prestasi_siswa for select
  to authenticated
  using (is_staf_lihat_siswa());
