-- =====================================================================
-- Perbaikan fungsi current_user_kelas() -- dipakai oleh RLS policy
-- tabel siswa_baru. Definisi lama merujuk ke tabel "user" & kolom
-- wali_kelas.id_user / wali_kelas.kelas yang tidak ada di skema
-- sekarang (sisa skema lama), sehingga error:
--   "column wk.id_user does not exist"
-- Diperbaiki supaya konsisten dengan current_user_gtk_id() dan policy
-- siswa01 yang sudah benar (wali_kelas.gtk_id + wali_kelas.rombel).
-- Jalankan di Supabase -> SQL Editor.
-- =====================================================================

create or replace function public.current_user_kelas()
returns text
language sql
stable security definer
as $function$
  select rombel from public.wali_kelas where gtk_id = current_user_gtk_id() limit 1;
$function$;
