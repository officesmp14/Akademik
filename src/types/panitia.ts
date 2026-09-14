export type JenisPanitia = "PTS" | "PAS";

export interface PanitiaPtsPas {
  id: string;
  tahun_ajaran: string;
  semester: "Ganjil" | "Genap";
  jenis: JenisPanitia;
  ketua_gtk_id: string | null;
  sekretaris_gtk_id: string | null;
  /** Tanggal cetak raport -- dipakai khusus untuk jenis PTS. */
  tanggal_cetak_rapor: string | null;
}

export const JENIS_PANITIA_LABEL: Record<JenisPanitia, string> = {
  PTS: "Penilaian Tengah Semester (PTS)",
  PAS: "Penilaian Akhir Semester (PAS)",
};

export interface PanitiaHibot {
  id: number;
  ketua_gtk_id: string | null;
  sekretaris_gtk_id: string | null;
}
