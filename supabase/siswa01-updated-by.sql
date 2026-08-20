-- =====================================================================
-- Tambah kolom untuk mencatat SIAPA & KAPAN terakhir mengubah data
-- seorang siswa. Dipakai di Laporan > Cek Data Kelas IX supaya admin
-- bisa melihat baris mana yang sudah diupdate oleh wali kelas masing2.
--
-- updated_by_nama disimpan sebagai teks (denormalisasi) langsung dari
-- sisi klien saat menyimpan, supaya halaman laporan tidak perlu query
-- tambahan ke tabel user_roles/datagtk (yang RLS-nya membatasi user
-- biasa hanya bisa lihat baris miliknya sendiri).
--
-- updated_at kolomnya sudah ada sejak awal (default now() saat insert),
-- tapi belum pernah diisi ulang otomatis saat update -- makanya nilainya
-- akan diisi manual oleh aplikasi setiap kali form edit ini disimpan.
--
-- Jalankan di Supabase -> SQL Editor.
-- =====================================================================

alter table siswa01 add column if not exists updated_by uuid;
alter table siswa01 add column if not exists updated_by_nama varchar;
