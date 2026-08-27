-- =====================================================================
-- Link Beban Kerja per GTK (link Google Drive dokumen beban kerja).
-- Setiap Guru/Kepala Sekolah/Staf TU mengisi link miliknya sendiri lewat
-- kolom baru datagtk.link_beban_kerja -- update-nya cukup pakai RLS
-- "own profile" yang sudah ada di datagtk (sama seperti halaman Profil
-- Saya sudah bisa update baris sendiri), tidak perlu policy baru.
--
-- Untuk MENAMPILKAN daftar semua GTK (nama, nip, jenis_ptk, link) ke
-- semua user login, dibuatkan view aman gtk_beban_kerja_publik (tanpa
-- security_invoker, bypass RLS restriktif datagtk yang membatasi guru
-- cuma lihat baris sendiri) -- pola sama seperti gtk_nama_publik.
-- jenis_ptk diikutkan supaya bisa difilter (Guru/Kepala Sekolah/Tenaga
-- Kependidikan) di halaman /link-beban-kerja.
-- Jalankan di Supabase -> SQL Editor.
-- =====================================================================

alter table datagtk add column if not exists link_beban_kerja text;

-- Pakai drop + create (bukan "create or replace") karena
-- "create or replace view" cuma boleh menambah kolom di AKHIR daftar --
-- jenis_ptk di sini ditambahkan di tengah, jadi drop dulu supaya tidak
-- kena galat "cannot change name of view column" / silently gagal.
drop view if exists public.gtk_beban_kerja_publik;
create view public.gtk_beban_kerja_publik as
select id, nama, nip, jenis_ptk, link_beban_kerja
from datagtk
where status_aktif = 'Y';

grant select on public.gtk_beban_kerja_publik to authenticated;
