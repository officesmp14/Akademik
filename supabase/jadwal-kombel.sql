-- =====================================================================
-- Modul Jadwal Kombel (Komunitas Belajar)
-- Jalankan di Supabase -> SQL Editor.
-- =====================================================================

create table if not exists jadwal_kombel (
  id uuid primary key default gen_random_uuid(),
  tanggal date not null,
  pekan_ke smallint not null check (pekan_ke between 1 and 6),
  gtk_id uuid references datagtk(id) on delete set null,
  topik_materi text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table jadwal_kombel enable row level security;

-- Semua user yang sudah login boleh melihat jadwal.
drop policy if exists "Authenticated users can view jadwal_kombel" on jadwal_kombel;
create policy "Authenticated users can view jadwal_kombel"
  on jadwal_kombel for select
  to authenticated
  using (true);

-- Insert/update/delete dibuka untuk semua user yang login (konsisten
-- dengan tabel lain seperti wali_kelas / pengaturan_nilai_mapel), tombol
-- tambah/edit/hapus di UI hanya ditampilkan untuk role admin & kepala_sekolah.
drop policy if exists "Authenticated users can insert jadwal_kombel" on jadwal_kombel;
create policy "Authenticated users can insert jadwal_kombel"
  on jadwal_kombel for insert
  to authenticated
  with check (true);

drop policy if exists "Authenticated users can update jadwal_kombel" on jadwal_kombel;
create policy "Authenticated users can update jadwal_kombel"
  on jadwal_kombel for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Authenticated users can delete jadwal_kombel" on jadwal_kombel;
create policy "Authenticated users can delete jadwal_kombel"
  on jadwal_kombel for delete
  to authenticated
  using (true);
