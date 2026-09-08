-- =====================================================================
-- Panitia Hibot -- satu baris pengaturan tetap (mirip profil_sekolah),
-- Ketua & Sekretaris dipilih dari tabel datagtk. Anggotanya otomatis
-- boleh akses laporan /laporan/ganak-hibot lewat pengecekan di
-- middleware (lihat src/lib/supabase/middleware.ts).
-- Jalankan di Supabase -> SQL Editor.
-- =====================================================================

create table if not exists panitia_hibot (
  id smallint primary key default 1,
  ketua_gtk_id uuid references datagtk(id) on delete set null,
  sekretaris_gtk_id uuid references datagtk(id) on delete set null,
  updated_at timestamptz default now(),
  constraint panitia_hibot_singleton check (id = 1)
);

alter table panitia_hibot enable row level security;

drop policy if exists "Authenticated users can view panitia_hibot" on panitia_hibot;
create policy "Authenticated users can view panitia_hibot"
  on panitia_hibot for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can manage panitia_hibot" on panitia_hibot;
create policy "Authenticated users can manage panitia_hibot"
  on panitia_hibot for all
  to authenticated
  using (true)
  with check (true);
