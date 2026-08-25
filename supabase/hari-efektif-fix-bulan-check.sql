-- =====================================================================
-- Perbaikan: constraint kolom "bulan" di tabel hari_efektif_bulanan masih
-- versi lama (belum termasuk 'September'), sehingga simpan data gagal
-- dengan error "violates check constraint hari_efektif_bulanan_bulan_check".
-- Migrasi ini mengganti constraint-nya dengan daftar 12 bulan yang lengkap.
--
-- Jalankan di Supabase -> SQL Editor.
-- =====================================================================

alter table hari_efektif_bulanan drop constraint if exists hari_efektif_bulanan_bulan_check;
alter table hari_efektif_bulanan add constraint hari_efektif_bulanan_bulan_check
  check (
    bulan in ('Juli', 'Agustus', 'September', 'Oktober', 'Nopember', 'Desember',
              'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni')
  );
