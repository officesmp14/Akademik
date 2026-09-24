-- =====================================================================
-- Analisis Kebutuhan Guru -- laporan tahunan kebutuhan guru per mata
-- pelajaran (dibandingkan dengan file Excel "Analisis Kebutuhan" yang
-- dikirim ke Dinas Pendidikan). Satu baris per (tahun_ajaran, mapel),
-- supaya data tahun lalu tetap tersimpan saat tahun ajaran baru diisi
-- (sama seperti gtk_penugasan_mengajar).
--
-- Kolom guru_pns/guru_pppk/guru_honor diisi guru (best-effort otomatis
-- dari gtk_penugasan_mengajar, lalu bisa dikoreksi manual). Kolom abk
-- (Kebutuhan), rombel_7/8/9, jjm, waka_perpus_lab murni input manual
-- karena angkanya kebijakan sekolah, tidak ada di tabel manapun.
-- Jalankan di Supabase -> SQL Editor.
-- =====================================================================

create table if not exists analisis_kebutuhan_guru (
  id uuid primary key default gen_random_uuid(),
  tahun_ajaran text not null,
  mapel text not null,
  guru_pns int not null default 0,
  guru_pppk int not null default 0,
  guru_honor int not null default 0,
  abk int,
  rombel_7 int not null default 0,
  rombel_8 int not null default 0,
  rombel_9 int not null default 0,
  jjm int,
  waka_perpus_lab int not null default 0,
  updated_at timestamptz default now(),
  unique (tahun_ajaran, mapel)
);

alter table analisis_kebutuhan_guru enable row level security;

drop policy if exists "Authenticated users can view analisis_kebutuhan_guru" on analisis_kebutuhan_guru;
create policy "Authenticated users can view analisis_kebutuhan_guru"
  on analisis_kebutuhan_guru for select
  to authenticated
  using (true);

drop policy if exists "Admin/Hak Akses kelola analisis_kebutuhan_guru" on analisis_kebutuhan_guru;
create policy "Admin/Hak Akses kelola analisis_kebutuhan_guru"
  on analisis_kebutuhan_guru for all
  to authenticated
  using (
    current_user_role() in ('admin', 'kepala_sekolah')
    or exists (
      select 1 from user_module_access uma
      where uma.user_id = auth.uid()
        and uma.module = 'analisis_kebutuhan'
        and uma.can_edit
    )
  )
  with check (
    current_user_role() in ('admin', 'kepala_sekolah')
    or exists (
      select 1 from user_module_access uma
      where uma.user_id = auth.uid()
        and uma.module = 'analisis_kebutuhan'
        and uma.can_edit
    )
  );
