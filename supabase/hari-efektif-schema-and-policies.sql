-- =====================================================================
-- Tabel Pengaturan Jumlah Hari Efektif per Bulan, per Tahun Ajaran.
-- Semester Ganjil: Juli, Agustus, Oktober, Nopember, Desember.
-- Semester Genap: Januari, Februari, Maret, April, Mei, Juni.
-- Jalankan di Supabase -> SQL Editor.
-- =====================================================================

create table if not exists hari_efektif_bulanan (
  id uuid primary key default gen_random_uuid(),
  tahun_ajaran varchar not null,
  semester varchar not null check (semester in ('Ganjil', 'Genap')),
  bulan varchar not null check (
    bulan in ('Juli', 'Agustus', 'September','Oktober', 'Nopember', 'Desember',
              'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni')
  ),
  jumlah_hari smallint not null default 0 check (jumlah_hari between 0 and 31),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (tahun_ajaran, bulan)
);

alter table hari_efektif_bulanan enable row level security;

-- Admin kelola penuh; role lain cuma baca (dipakai sebagai referensi baca
-- di halaman lain, mis. perhitungan rekap kehadiran nantinya).
drop policy if exists "Admin manage hari efektif" on hari_efektif_bulanan;
create policy "Admin manage hari efektif"
  on hari_efektif_bulanan for all
  to authenticated
  using (current_user_role() = 'admin')
  with check (current_user_role() = 'admin');

drop policy if exists "Semua user login view hari efektif" on hari_efektif_bulanan;
create policy "Semua user login view hari efektif"
  on hari_efektif_bulanan for select
  to authenticated
  using (true);
