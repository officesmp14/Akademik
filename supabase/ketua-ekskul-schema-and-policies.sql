-- =====================================================================
-- Penugasan Ketua Ekstrakurikuler -- satu guru sebagai ketua untuk tiap
-- ekstrakurikuler (daftar ekstrakurikulernya dikelola lewat tabel
-- referensi ref_ekstrakurikuler, lihat tabel-referensi-ekstrakurikuler.sql).
-- Jalankan di Supabase -> SQL Editor.
-- =====================================================================

create table if not exists ketua_ekskul (
  id uuid primary key default gen_random_uuid(),
  ekskul_kode integer not null references ref_ekstrakurikuler(kode) on delete cascade,
  gtk_id uuid not null references datagtk(id) on delete cascade,
  created_at timestamptz default now(),
  unique (ekskul_kode)
);

alter table ketua_ekskul enable row level security;

drop policy if exists "Authenticated users can view ketua_ekskul" on ketua_ekskul;
create policy "Authenticated users can view ketua_ekskul"
  on ketua_ekskul for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can manage ketua_ekskul" on ketua_ekskul;
create policy "Authenticated users can manage ketua_ekskul"
  on ketua_ekskul for all
  to authenticated
  using (true)
  with check (true);
