// Analisis Kebutuhan Guru/Tenaga Administrasi/Kebersihan & Keamanan --
// helper bersama untuk halaman /laporan/analisis-kebutuhan.

/** 15 mata pelajaran tetap, urutan & label sama persis dengan file Excel
 *  "Analisis Kebutuhan" yang dikirim ke Dinas Pendidikan. */
export const MAPEL_KEBUTUHAN_GURU = [
  "PKn",
  "Bahasa Indonesia",
  "Matematika",
  "Ilmu Pengetahuan Alam (IPA)",
  "Ilmu Pengetahuan Sosial (IPS)",
  "Bahasa Inggris",
  "Seni Budaya/Prakarya",
  "PJOK",
  "Bimbingan dan Konseling (BK)",
  "Informatika",
  "Pendidikan Agama Islam",
  "Pendidikan Agama Katolik",
  "Pendidikan Agama Kristen",
  "Pendidikan Agama Budha",
  "Pendidikan Agama Hindu",
] as const;

export type MapelKebutuhanGuru = (typeof MAPEL_KEBUTUHAN_GURU)[number];

// Persentase golongan/pangkat PNS TETAP sesuai standar (Pertama/Muda/
// Madya/Utama), dikalikan ke ABK -- bukan nilai yang bisa diedit user.
export const GOLONGAN_PERSEN = {
  pertama: 0.47,
  muda: 0.29,
  madya: 0.18,
  utama: 0.06,
} as const;

// Kata kunci pencocokan (huruf kecil semua) per mapel -- dicek berurutan,
// baris Agama dicek LEBIH DULU supaya "agama islam" tidak kepotong jadi
// cuma cocok kata umum. datagtk.kompetensi adalah teks bebas
// jadi ini best-effort saja; hasilnya tetap bisa dikoreksi manual di UI.
const KEYWORD_MAPEL: [MapelKebutuhanGuru, string[]][] = [
  ["Pendidikan Agama Islam", ["agama islam", "pendidikan agama islam", "pai"]],
  ["Pendidikan Agama Katolik", ["agama katolik", "agama katholik"]],
  ["Pendidikan Agama Kristen", ["agama kristen", "agama protestan"]],
  ["Pendidikan Agama Budha", ["agama budha", "agama buddha"]],
  ["Pendidikan Agama Hindu", ["agama hindu"]],
  ["PKn", ["pkn", "pendidikan kewarganegaraan", "kewarganegaraan"]],
  ["Bahasa Indonesia", ["bahasa indonesia", "b. indonesia", "b.indonesia", "bindo"]],
  ["Bahasa Inggris", ["bahasa inggris", "b. inggris", "b.inggris", "bing"]],
  ["Matematika", ["matematika", "mtk"]],
  ["Ilmu Pengetahuan Alam (IPA)", ["ilmu pengetahuan alam", "ipa"]],
  ["Ilmu Pengetahuan Sosial (IPS)", ["ilmu pengetahuan sosial", "ips"]],
  ["Seni Budaya/Prakarya", ["seni budaya", "prakarya", "sbdp", "sbk"]],
  ["PJOK", ["pjok", "penjas", "jasmani"]],
  ["Bimbingan dan Konseling (BK)", ["bimbingan dan konseling", "bimbingan konseling", "konseling", "bk"]],
  ["Informatika", ["informatika", "tik", "komputer"]],
];

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Cocokkan teks bebas datagtk.kompetensi ke salah satu dari
 *  15 mapel tetap -- null kalau tidak ada yang cocok. Pakai batas kata
 *  (\b) supaya kata pendek seperti "bing" tidak ikut cocok di tengah kata
 *  lain (mis. "bimBINGan" salah kecocok ke Bahasa Inggris). */
export function cocokkanMapel(mengajar: string | null | undefined): MapelKebutuhanGuru | null {
  if (!mengajar) return null;
  const teks = mengajar.toLowerCase().trim();
  for (const [mapel, keywords] of KEYWORD_MAPEL) {
    const cocok = keywords.some((kw) => new RegExp(`\\b${escapeRegex(kw.trim())}\\b`).test(teks));
    if (cocok) return mapel;
  }
  return null;
}

export type BucketKepegawaian = "pns" | "pppk" | "honor";

/** Kelompokkan datagtk.status_kepegawaian ke salah satu dari 3 bucket
 *  (PNS/PPPK/Honor) -- kedua varian "Guru Honor Sekolah" & "Tenaga Honor
 *  Sekolah" digabung jadi satu bucket Honor. */
export function bucketStatusKepegawaian(status: string | null | undefined): BucketKepegawaian | null {
  if (status === "PNS") return "pns";
  if (status === "PPPK") return "pppk";
  if (status === "Guru Honor Sekolah" || status === "Tenaga Honor Sekolah") return "honor";
  return null;
}

export type AnalisisKebutuhanGuru = {
  id?: string;
  tahun_ajaran: string;
  mapel: string;
  guru_pns: number;
  guru_pppk: number;
  guru_honor: number;
  abk: number | null;
  rombel_7: number;
  rombel_8: number;
  rombel_9: number;
  jjm: number | null;
  waka_perpus_lab: number;
};

export function hitungJumlahGuru(row: AnalisisKebutuhanGuru): number {
  return row.guru_pns + row.guru_pppk + row.guru_honor;
}

export function hitungJumlahRombel(row: AnalisisKebutuhanGuru): number {
  return row.rombel_7 + row.rombel_8 + row.rombel_9;
}

export function hitungJmlJjm(row: AnalisisKebutuhanGuru): number {
  return hitungJumlahRombel(row) * (row.jjm ?? 0);
}

export function hitungTotalJam(row: AnalisisKebutuhanGuru): number {
  return hitungJmlJjm(row) + row.waka_perpus_lab;
}

export function hitungJamPerGuru(row: AnalisisKebutuhanGuru): number | null {
  const jumlah = hitungJumlahGuru(row);
  if (jumlah === 0) return null;
  return Math.round((hitungTotalJam(row) / jumlah) * 100) / 100;
}

export function hitungKurangLebihGuru(row: AnalisisKebutuhanGuru): number | null {
  if (row.abk === null) return null;
  return hitungJumlahGuru(row) - row.abk;
}

export function hitungGolongan(abk: number | null): { pertama: number; muda: number; madya: number; utama: number } {
  const base = abk ?? 0;
  return {
    pertama: Math.round(base * GOLONGAN_PERSEN.pertama * 100) / 100,
    muda: Math.round(base * GOLONGAN_PERSEN.muda * 100) / 100,
    madya: Math.round(base * GOLONGAN_PERSEN.madya * 100) / 100,
    utama: Math.round(base * GOLONGAN_PERSEN.utama * 100) / 100,
  };
}

/** Kebutuhan petugas kebersihan = jumlah murid aktif / 200 (dibulatkan),
 *  sesuai rumus di Excel Dinas Pendidikan. */
export function hitungKebutuhanKebersihan(jumlahMurid: number): number {
  return Math.round(jumlahMurid / 200);
}
