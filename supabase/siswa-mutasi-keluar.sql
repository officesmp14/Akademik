-- =====================================================================
-- Riwayat Siswa Mutasi Keluar (tabel terpisah dari siswa01)
-- siswa01.status_siswa cukup diubah jadi 'Mutasi'; detail mutasinya
-- (tanggal, alasan, sekolah tujuan) dicatat di sini.
-- Jalankan di Supabase -> SQL Editor.
-- =====================================================================

create table if not exists siswa_mutasi_keluar (
  id uuid primary key default gen_random_uuid(),
  siswa_id uuid not null unique references siswa01(id) on delete cascade,
  tanggal_mutasi date,
  alasan_mutasi text,
  sekolah_tujuan varchar,
  alamat_sekolah_tujuan text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table siswa_mutasi_keluar enable row level security;

drop policy if exists "Authenticated users can view siswa_mutasi_keluar" on siswa_mutasi_keluar;
create policy "Authenticated users can view siswa_mutasi_keluar"
  on siswa_mutasi_keluar for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can manage siswa_mutasi_keluar" on siswa_mutasi_keluar;
create policy "Authenticated users can manage siswa_mutasi_keluar"
  on siswa_mutasi_keluar for all
  to authenticated
  using (true)
  with check (true);
