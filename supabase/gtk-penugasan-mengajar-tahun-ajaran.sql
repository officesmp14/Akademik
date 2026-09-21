-- =====================================================================
-- Penugasan Mengajar berubah tiap tahun ajaran (beban mengajar guru tidak
-- sama tiap tahun) -- tambahkan kolom tahun_ajaran supaya data tahun lalu
-- tidak tertimpa/hilang saat guru menambahkan penugasan untuk tahun baru.
-- Baris lama (sebelum kolom ini ada) di-backfill berdasarkan created_at,
-- pakai aturan tahun ajaran yang sama dengan getTahunAjaranSaatIni() di
-- kode aplikasi: Juli-Desember masuk tahun ajaran yang dimulai tahun itu,
-- Januari-Juni masuk tahun ajaran yang dimulai tahun sebelumnya.
-- Jalankan di Supabase -> SQL Editor.
-- =====================================================================

alter table gtk_penugasan_mengajar add column if not exists tahun_ajaran text;

update gtk_penugasan_mengajar
set tahun_ajaran = case
  when extract(month from coalesce(created_at, now())) >= 7
    then extract(year from coalesce(created_at, now()))::int || '/' || (extract(year from coalesce(created_at, now()))::int + 1)
  else (extract(year from coalesce(created_at, now()))::int - 1) || '/' || extract(year from coalesce(created_at, now()))::int
end
where tahun_ajaran is null;

alter table gtk_penugasan_mengajar alter column tahun_ajaran set not null;
