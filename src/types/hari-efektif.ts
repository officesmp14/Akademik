export type Semester = "Ganjil" | "Genap";

export interface HariEfektifBulanan {
  id?: string;
  tahun_ajaran: string;
  semester: Semester;
  bulan: string;
  jumlah_hari: number;
}

export const BULAN_GANJIL = ["Juli", "Agustus", "September", "Oktober", "Nopember", "Desember"];
export const BULAN_GENAP = ["Januari", "Februari", "Maret", "April", "Mei", "Juni"];
