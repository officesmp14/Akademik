// Staf (datagtk.jenis_ptk_pdd) yang boleh MELIHAT (baca saja) menu Data Siswa,
// Status Update GTK, dan Analisis Kebutuhan.
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

/** Path yang boleh dibuka staf -- /siswa persis (daftar) saja,
 *  bukan /siswa/tambah atau /siswa/{id} (form ubah data). */
export function isPathLihatSiswaStaf(path: string): boolean {
  if (path === "/siswa" || path === "/siswa/" || path === "/laporan" || path === "/laporan/") return true;
  return [
    "/siswa/mutasi-masuk",
    "/registrasi-peserta-didik",
    "/data-periodik",
    "/prestasi-siswa",
    "/kartu-pelajar",
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
