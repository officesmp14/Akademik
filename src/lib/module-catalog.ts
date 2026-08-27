export type ModuleKey =
  | "siswa"
  | "gtk"
  | "laporan_rekap_siswa"
  | "laporan_statistik_sekolah"
  | "laporan_bandingkan_data"
  | "laporan_riwayat_mutasi"
  | "laporan_cek_kursi"
  | "laporan_cek_nis"
  | "laporan_data_siswa_mbg"
  | "laporan_dinas_gtk"
  | "laporan_kesehatan"
  | "laporan_kelas_ix"
  | "laporan_verifikasi_presensi"
  | "mutasi_masuk_siswa"
  | "registrasi_peserta_didik"
  | "data_periodik"
  | "presensi_rekap";

export const MODULES: { key: ModuleKey; label: string }[] = [
  { key: "siswa", label: "Data Siswa" },
  { key: "gtk", label: "Data GTK" },
  { key: "laporan_rekap_siswa", label: "Laporan - Rekap Siswa" },
  { key: "laporan_statistik_sekolah", label: "Laporan - Statistik Rombel & Agama" },
  { key: "laporan_bandingkan_data", label: "Laporan - Bandingkan Data" },
  { key: "laporan_riwayat_mutasi", label: "Laporan - Riwayat Siswa Mutasi Keluar" },
  { key: "laporan_cek_kursi", label: "Laporan - Cek Kursi" },
  { key: "laporan_cek_nis", label: "Laporan - Cek NIS" },
  { key: "laporan_data_siswa_mbg", label: "Laporan - Data Siswa MBG" },
  { key: "laporan_dinas_gtk", label: "Laporan - Dinas GTK" },
  { key: "laporan_kesehatan", label: "Laporan - Data Pemeriksaan Kesehatan" },
  { key: "laporan_kelas_ix", label: "Laporan - Cek Data Ijazah Kelas IX" },
  { key: "laporan_verifikasi_presensi", label: "Laporan - Verifikasi Presensi" },
  { key: "mutasi_masuk_siswa", label: "Data Mutasi Masuk" },
  { key: "registrasi_peserta_didik", label: "Registrasi Peserta Didik" },
  { key: "data_periodik", label: "Data Periodik" },
  { key: "presensi_rekap", label: "Rekap Presensi" },
];

export const MODULE_LABEL: Record<string, string> = Object.fromEntries(
  MODULES.map((m) => [m.key, m.label])
);
