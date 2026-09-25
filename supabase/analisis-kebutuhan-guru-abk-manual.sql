-- =====================================================================
-- Analisis Kebutuhan Guru -- ABK bisa diisi manual (sementara).
-- abk_manual kosong  -> ABK dihitung otomatis (Kebutuhan PNS dibulatkan ke bawah)
-- abk_manual terisi  -> angka manual dipakai sebagai ABK
-- Kolom abk tetap menyimpan ABK yang berlaku (hasil akhir).
-- Jalankan di Supabase -> SQL Editor.
-- =====================================================================

alter table analisis_kebutuhan_guru add column if not exists abk_manual int;
