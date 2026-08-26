-- =====================================================================
-- Tabel Jadwal Supervisi Guru (kepala sekolah mengamati proses mengajar
-- guru di kelas, pada tanggal & jam pelajaran tertentu).
-- Bisa dibuat oleh admin, kepala sekolah, atau guru yang bersangkutan
-- sendiri. Semua user login boleh melihat semua jadwal (transparan,
-- mirip jadwal_kombel), tapi cuma admin/kepsek/guru pemilik baris yang
-- boleh ubah/hapus.
-- Jalankan di Supabase -> SQL Editor.
-- =====================================================================

create table if not exists jadwal_supervisi (
  id uuid primary key default gen_random_uuid(),
  gtk_id uuid not null references datagtk(id) on delete cascade,
  tanggal date not null,
  rombel varchar not null,
  jam_ke smallint not null check (jam_ke between 1 and 8),
  status varchar not null default 'Direncanakan'
    check (status in ('Direncanakan', 'Terlaksana', 'Dibatalkan')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table jadwal_supervisi enable row level security;

drop policy if exists "Admin manage jadwal supervisi" on jadwal_supervisi;
create policy "Admin manage jadwal supervisi"
  on jadwal_supervisi for all
  to authenticated
  using (current_user_role() = 'admin')
  with check (current_user_role() = 'admin');

drop policy if exists "Kepala sekolah manage jadwal supervisi" on jadwal_supervisi;
create policy "Kepala sekolah manage jadwal supervisi"
  on jadwal_supervisi for all
  to authenticated
  using (current_user_role() = 'kepala_sekolah')
  with check (current_user_role() = 'kepala_sekolah');

drop policy if exists "Guru manage own jadwal supervisi" on jadwal_supervisi;
create policy "Guru manage own jadwal supervisi"
  on jadwal_supervisi for all
  to authenticated
  using (gtk_id = current_user_gtk_id())
  with check (gtk_id = current_user_gtk_id());

drop policy if exists "Semua user login view jadwal supervisi" on jadwal_supervisi;
create policy "Semua user login view jadwal supervisi"
  on jadwal_supervisi for select
  to authenticated
  using (true);
