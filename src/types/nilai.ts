export interface Pelajaran {
  id: number;
  mapel: string;
  singkatan: string | null;
}

export interface GuruMengajarKelas {
  id?: string;
  gtk_id: string;
  mapel_id: number;
  rombel: string;
}

/** Bobot nilai raport -- GLOBAL, berlaku untuk semua mapel. */
export interface PengaturanBobotNilai {
  id: number; // selalu 1
  bobot_formatif: number;
  bobot_sumatif_materi: number;
  bobot_sa: number;
}

/** KKB (dulu KKM) -- beda-beda per mapel. */
export interface PengaturanNilaiMapel {
  id?: string;
  mapel_id: number;
  kkb: number;
}

export type JenisNilai =
  | "formatif"
  | "sumatif_materi"
  | "sts"
  | "sas"
  | "susulan_sts"
  | "remedial_sts"
  | "susulan_sas"
  | "remedial_sas";

export interface Nilai {
  id?: string;
  siswa_id: string;
  gtk_id: string;
  mapel_id: number;
  rombel: string;
  tahun_ajaran: string;
  semester: "Ganjil" | "Genap";
  jenis: JenisNilai;
  nama_komponen: string;
  nilai: number;
}

export interface PengaturanAkademik {
  id: number;
  tahun_ajaran: string;
  semester: "Ganjil" | "Genap";
  tanggal_bagi_rapor_sts_ganjil: string | null;
  tanggal_bagi_rapor_sts_genap: string | null;
}

/** Tahun ajaran berjalan dalam format "2026/2027". */
export function getTahunAjaranSaatIni(date: Date = new Date()): string {
  const bulan = date.getMonth() + 1;
  const tahunAwal = bulan >= 7 ? date.getFullYear() : date.getFullYear() - 1;
  return `${tahunAwal}/${tahunAwal + 1}`;
}

/** Semester berjalan: Juli-Desember = Ganjil, Januari-Juni = Genap. */
export function getSemesterSaatIni(date: Date = new Date()): "Ganjil" | "Genap" {
  const bulan = date.getMonth() + 1;
  return bulan >= 7 ? "Ganjil" : "Genap";
}

export type HasilNilaiAkhir = {
  avgFormatif: number | null;
  avgSumatifMateri: number | null;
  avgSa: number | null; // rata-rata STS & SAS
  nilaiAkhir: number | null;
  tuntas: boolean | null;
};

function rataRata(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

/**
 * Rumus Kurikulum Merdeka: Nilai Akhir = (bobot_F x F + bobot_S x S + bobot_SA x SA) / total bobot
 * F = rata-rata Formatif, S = rata-rata Sumatif Lingkup Materi,
 * SA = rata-rata (STS, SAS) -- keduanya digabung jadi satu komponen "Sumatif Akhir"
 * Bobot bersifat GLOBAL (sama untuk semua mapel), KKB beda per mapel.
 */
export function hitungNilaiAkhir(
  formatifVals: number[],
  sumatifMateriVals: number[],
  saVals: number[], // gabungan nilai STS + SAS
  bobot: Pick<PengaturanBobotNilai, "bobot_formatif" | "bobot_sumatif_materi" | "bobot_sa">,
  kkb: number
): HasilNilaiAkhir {
  const avgFormatif = rataRata(formatifVals);
  const avgSumatifMateri = rataRata(sumatifMateriVals);
  const avgSa = rataRata(saVals);

  if (avgFormatif === null || avgSumatifMateri === null || avgSa === null) {
    return { avgFormatif, avgSumatifMateri, avgSa, nilaiAkhir: null, tuntas: null };
  }

  const totalBobot = bobot.bobot_formatif + bobot.bobot_sumatif_materi + bobot.bobot_sa;
  const nilaiAkhir =
    (avgFormatif * bobot.bobot_formatif +
      avgSumatifMateri * bobot.bobot_sumatif_materi +
      avgSa * bobot.bobot_sa) /
    totalBobot;

  return {
    avgFormatif,
    avgSumatifMateri,
    avgSa,
    nilaiAkhir: Math.round(nilaiAkhir * 100) / 100,
    tuntas: nilaiAkhir >= kkb,
  };
}
