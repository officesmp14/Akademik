// Staf (datagtk.jenis_ptk_pdd) yang boleh MELIHAT (baca saja) menu Data Siswa,
// Data GTK, Status Update GTK, dan Analisis Kebutuhan.
// Dipakai di current-user (sidebar/halaman) dan middleware (akses URL).
// Harus sama dengan daftar di supabase/staf-lihat-data-siswa.sql.
export const STAF_LIHAT_SISWA_JENIS_PTK_PDD = [
  "Pengadministrasi Perkantoran",
  "Penata Layanan Operasional",
  "Penelaah Teknis Kebijakan",
];

export function isStafLihatSiswa(jenisPtkPdd: string | null | undefined): boolean {
  return Boolean(jenisPtkPdd) && STAF_LIHAT_SISWA_JENIS_PTK_PDD.includes(jenisPtkPdd as string);
}

/** Path yang boleh dibuka staf -- daftar /siswa dan detail /siswa/{id} (baca saja),
 *  bukan /siswa/tambah atau /siswa/import. */
export function isPathLihatSiswaStaf(path: string): boolean {
  if (path === "/siswa" || path === "/siswa/" || path === "/laporan" || path === "/laporan/") return true;
  // Daftar GTK (/gtk) dan detail GTK (/gtk/{uuid}) -- baca saja untuk staf
  if (path === "/gtk" || path === "/gtk/" || /^\/gtk\/[0-9a-fA-F-]{36}\/?$/.test(path)) return true;
  // Detail satu siswa (/siswa/{uuid}) -- formnya dibuat baca saja untuk staf
  if (/^\/siswa\/[0-9a-fA-F-]{36}\/?$/.test(path)) return true;
  return [
    "/siswa/mutasi-masuk",
    "/registrasi-peserta-didik",
    "/data-periodik",
    "/prestasi-siswa",
    "/kartu-pelajar",
    "/cover-rapor",
    "/laporan/riwayat-mutasi",
    // Laporan (semuanya baca saja). TIDAK termasuk /laporan/dinas-gtk (data GTK
    // sensitif), /laporan/kelas-ix & /laporan/verifikasi-presensi (alat kerja wali kelas).
    "/laporan/rekap-siswa",
    "/laporan/bandingkan-data",
    "/laporan/statistik-sekolah",
    "/laporan/cek-kursi",
    "/laporan/cek-nis",
    "/laporan/data-siswa-mbg",
    "/laporan/kesehatan",
    "/laporan/ganak-hibot",
    // Data GTK (baca saja)
    "/laporan/status-update-gtk",
    "/laporan/analisis-kebutuhan",
  ].some((p) => path.startsWith(p));
}
