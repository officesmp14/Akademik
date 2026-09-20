export type JenisUjianSekolah = "Tertulis" | "Praktik";

export interface NilaiUjianSekolah {
  id?: string;
  nisn: string;
  tahun_ajaran: string;
  jenis: JenisUjianSekolah;
  /** Kelas siswa PADA SAAT nilai ini diinput (mis. "IX.1"). */
  kelas?: string | null;
  agama?: number | null;
  pkn?: number | null;
  bind?: number | null;
  mtk?: number | null;
  ipa?: number | null;
  ips?: number | null;
  bing?: number | null;
  pjok?: number | null;
  informatika?: number | null;
  prakarya?: number | null;
}

/** Kolom Agama cuma SATU (bukan per-agama seperti Nilai Leger) -- guru yang
 *  menginput sudah tahu ini nilai ujian agama siswa itu sendiri. */
export const AGAMA_KOLOM_UJIAN = { key: "agama", label: "Agama" } as const;

/** Kolom mapel non-agama, sesuai urutan yang diminta. */
export const MAPEL_UJIAN_KOLOM = [
  { key: "pkn", label: "PKn" },
  { key: "bind", label: "B. Indonesia" },
  { key: "mtk", label: "Matematika" },
  { key: "ipa", label: "IPA" },
  { key: "ips", label: "IPS" },
  { key: "bing", label: "B. Inggris" },
  { key: "pjok", label: "PJOK" },
  { key: "prakarya", label: "Prakarya" },
  { key: "informatika", label: "Informatika" },
] as const;

export type MapelUjianKolomKey = (typeof MAPEL_UJIAN_KOLOM)[number]["key"];

/** Semua kolom nilai (Agama + mapel non-agama), sesuai urutan tampilan. */
export const SEMUA_KOLOM_UJIAN = [AGAMA_KOLOM_UJIAN, ...MAPEL_UJIAN_KOLOM] as const;

export type KolomUjianKey = (typeof SEMUA_KOLOM_UJIAN)[number]["key"];
