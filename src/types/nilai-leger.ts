export interface NilaiLeger {
  id?: string;
  nisn: string;
  tahun_ajaran: string;
  semester: "Ganjil" | "Genap";
  islam?: number | null;
  kristen?: number | null;
  katolik?: number | null;
  budha?: number | null;
  pkn?: number | null;
  bind?: number | null;
  mtk?: number | null;
  ipa?: number | null;
  ips?: number | null;
  bing?: number | null;
  pjok?: number | null;
  infor?: number | null;
  prakarya?: number | null;
  sakit?: number | null;
  izin?: number | null;
  alpa?: number | null;
  /** Kelas siswa PADA SAAT nilai ini dicatat (mis. "VII.1") -- bisa beda
   *  dari rombel siswa01 sekarang kalau siswanya sudah naik kelas. */
  kelas_old?: string | null;
}

/** Kolom mapel agama -- cuma satu yang boleh diisi per siswa, sesuai
 *  agama siswa itu sendiri (kolom `agama` di siswa01 / ref_agama.uraian). */
export const AGAMA_KOLOM = [
  { key: "islam", label: "Islam", agama: "Islam" },
  { key: "kristen", label: "Kristen", agama: "Kristen" },
  { key: "katolik", label: "Katolik", agama: "Katholik" },
  { key: "budha", label: "Budha", agama: "Budha" },
] as const;

/** Kolom mapel non-agama, urutan sesuai tampilan leger e-Rapor. */
export const MAPEL_KOLOM = [
  { key: "pkn", label: "PKn" },
  { key: "bind", label: "B. Indonesia" },
  { key: "mtk", label: "Matematika" },
  { key: "ipa", label: "IPA" },
  { key: "ips", label: "IPS" },
  { key: "bing", label: "B. Inggris" },
  { key: "pjok", label: "PJOK" },
  { key: "infor", label: "Informatika" },
  { key: "prakarya", label: "Prakarya" },
] as const;

/** Kolom rekap ketidakhadiran (jumlah hari, bukan nilai 0-100). */
export const KETIDAKHADIRAN_KOLOM = [
  { key: "sakit", label: "Sakit" },
  { key: "izin", label: "Izin" },
  { key: "alpa", label: "Alpa" },
] as const;

export type MapelKolomKey = (typeof MAPEL_KOLOM)[number]["key"];
export type AgamaKolomKey = (typeof AGAMA_KOLOM)[number]["key"];
export type KetidakhadiranKolomKey = (typeof KETIDAKHADIRAN_KOLOM)[number]["key"];
