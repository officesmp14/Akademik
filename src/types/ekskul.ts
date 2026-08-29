export interface SiswaEkskul {
  id: string;
  tahun_ajaran: string;
  semester: "Ganjil" | "Genap";
  siswa_id: string;
  ekskul_kode: number;
  gtk_id: string | null;
}
