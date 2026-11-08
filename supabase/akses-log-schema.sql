-- =====================================================================
-- Akses Pengguna -- catat login & halaman/menu yang dibuka tiap user.
--   jenis = 'login'   : tiap kali berhasil login (dicatat dari halaman login)
--   jenis = 'halaman' : tiap kali user membuka satu halaman di aplikasi
-- Hanya admin yang boleh MEMBACA (lewat fungsi ringkasan & tabel);
-- setiap user hanya boleh MENCATAT aksesnya sendiri.
-- Jalankan di Supabase -> SQL Editor.
-- =====================================================================

create table if not exists akses_log (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid(),
  jenis text not null check (jenis in ('login', 'halaman')),
  path text,
  menu text,
  created_at timestamptz not null default now()
);

create index if not exists akses_log_user_waktu_idx on akses_log (user_id, created_at desc);
create index if not exists akses_log_waktu_idx on akses_log (created_at desc);

alter table akses_log enable row level security;

drop policy if exists "User catat akses sendiri" on akses_log;
create policy "User catat akses sendiri"
  on akses_log for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Admin lihat akses_log" on akses_log;
create policy "Admin lihat akses_log"
  on akses_log for select
  to authenticated
  using (current_user_role() = 'admin');

-- Ringkasan per pengguna (hanya admin). Termasuk user yang belum pernah tercatat.
create or replace function public.akses_pengguna_ringkasan()
returns table (
  user_id uuid,
  email text,
  nama text,
  role text,
  jumlah_login bigint,
  jumlah_akses bigint,
  terakhir_login timestamptz,
  terakhir_akses timestamptz,
  menu_terakhir text,
  last_sign_in_auth timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $function$
begin
  if current_user_role() is distinct from 'admin' then
    raise exception 'Hanya admin yang boleh melihat data akses pengguna';
  end if;

  return query
  select
    ur.user_id,
    u.email::text,
    g.nama::text,
    ur.role::text,
    count(l.id) filter (where l.jenis = 'login'),
    count(l.id) filter (where l.jenis = 'halaman'),
    max(l.created_at) filter (where l.jenis = 'login'),
    max(l.created_at),
    (
      select l2.menu from akses_log l2
      where l2.user_id = ur.user_id and l2.jenis = 'halaman'
      order by l2.created_at desc limit 1
    ),
    u.last_sign_in_at
  from user_roles ur
  join auth.users u on u.id = ur.user_id
  left join datagtk g on g.id = ur.gtk_id
  left join akses_log l on l.user_id = ur.user_id
  group by ur.user_id, u.email, g.nama, ur.role, u.last_sign_in_at;
end;
$function$;

grant execute on function public.akses_pengguna_ringkasan() to authenticated;
