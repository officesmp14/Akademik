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
  /** ABK yang diisi manual; kosong = pakai hitungan otomatis. */
  abk_manual?: number | null;
  rombel_7: number;
  rombel_8: number;
  rombel_9: number;
  jjm: number | null;
  waka_perpus_lab: number;
  /** Turunan dari pelajaran.jumlah_rombel -- tidak disimpan di tabel analisis. */
  jumlah_rombel?: number | null;
};

// Nama baris di tabel pelajaran untuk tiap mapel Analisis Kebutuhan. Kalau
// satu mapel menggabung beberapa baris pelajaran (Seni Budaya + Prakarya),
// JJM dijumlah dan rombel diambil dari baris pertama.
export const PELAJARAN_UNTUK_MAPEL: Record<MapelKebutuhanGuru, string[]> = {
  PKn: ["PKn"],
  "Bahasa Indonesia": ["Bahasa Indonesia"],
  Matematika: ["Matematika"],
  "Ilmu Pengetahuan Alam (IPA)": ["Ilmu Pengetahuan Alam"],
  "Ilmu Pengetahuan Sosial (IPS)": ["Ilmu Pengetahuan Sosial"],
  "Bahasa Inggris": ["Bahasa Inggris"],
  "Seni Budaya/Prakarya": ["Seni Budaya", "Prakarya"],
  PJOK: ["PJOK"],
  "Bimbingan dan Konseling (BK)": ["Bimbingan Konseling"],
  Informatika: ["Informatika"],
  "Pendidikan Agama Islam": ["Agama Islam"],
  "Pendidikan Agama Katolik": ["Agama Katolik"],
  "Pendidikan Agama Kristen": ["Agama Protestan"],
  "Pendidikan Agama Budha": ["Agama Budha"],
  "Pendidikan Agama Hindu": ["Agama Hindu"],
};

export type PelajaranRef = {
  mapel: string;
  jjm: number | null;
  jml_rombel7: number | null;
  jml_rombel8: number | null;
  jml_rombel9: number | null;
  jumlah_rombel: number | null;
};

/** Rombel VII/VIII/IX, jumlah rombel, dan JJM satu mapel Analisis Kebutuhan
 *  dari tabel pelajaran -- null kalau baris pelajarannya tidak ditemukan. */
export function turunanDariPelajaran(
  mapel: MapelKebutuhanGuru,
  pelajaran: PelajaranRef[]
): Pick<AnalisisKebutuhanGuru, "rombel_7" | "rombel_8" | "rombel_9" | "jjm" | "jumlah_rombel"> | null {
  const cocok = PELAJARAN_UNTUK_MAPEL[mapel]
    .map((nama) => pelajaran.find((p) => p.mapel === nama))
    .filter((p): p is PelajaranRef => Boolean(p));
  if (cocok.length === 0) return null;
  const first = cocok[0];
  return {
    rombel_7: first.jml_rombel7 ?? 0,
    rombel_8: first.jml_rombel8 ?? 0,
    rombel_9: first.jml_rombel9 ?? 0,
    jumlah_rombel: first.jumlah_rombel ?? 0,
    jjm: cocok.reduce((acc, p) => acc + (p.jjm ?? 0), 0),
  };
}

export function hitungJumlahGuru(row: AnalisisKebutuhanGuru): number {
  return row.guru_pns + row.guru_pppk + row.guru_honor;
}

export function hitungJumlahRombel(row: AnalisisKebutuhanGuru): number {
  return row.jumlah_rombel ?? row.rombel_7 + row.rombel_8 + row.rombel_9;
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

/** Kebutuhan PNS = Total Jam / 24 (2 desimal untuk tampilan). */
export function hitungKebutuhanPns(row: AnalisisKebutuhanGuru): number {
  return Math.round((hitungTotalJam(row) / 24) * 100) / 100;
}

/** ABK otomatis = Kebutuhan PNS dibulatkan ke bawah (dari nilai tak dibulatkan). */
export function hitungAbkOtomatis(row: AnalisisKebutuhanGuru): number {
  return Math.floor(hitungTotalJam(row) / 24 + 1e-9);
}

/** ABK yang berlaku: angka manual kalau diisi, kalau tidak hitungan otomatis. */
export function hitungAbk(row: AnalisisKebutuhanGuru): number {
  return row.abk_manual ?? hitungAbkOtomatis(row);
}

export function hitungKurangLebihGuru(row: AnalisisKebutuhanGuru): number {
  return hitungJumlahGuru(row) - hitungAbk(row);
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

/** Tugas tambahan (Waka/Perpus/Lab) per mapel: tiap GTK yang jam_tugas_tambahan-nya
 *  >= 12 dihitung 12 jam (lebih dari 12 dipotong jadi 12; di bawah 12 diabaikan).
 *  Satu GTK maksimal 12 walau punya beberapa penugasan di tahun ajaran itu. */
export function hitungWakaPerpusLabPerMapel(
  gtkList: { id: string; kompetensi: string | null }[],
  penugasanList: { gtk_id: string; jam_tugas_tambahan: string | null }[]
): Record<string, number> {
  const hasil: Record<string, number> = {};
  const gtkSudah = new Set<string>();
  const mapelByGtk = new Map(gtkList.map((g) => [g.id, cocokkanMapel(g.kompetensi)]));
  for (const p of penugasanList) {
    const mapel = mapelByGtk.get(p.gtk_id);
    if (!mapel || gtkSudah.has(p.gtk_id)) continue;
    const jam = parseFloat(p.jam_tugas_tambahan ?? "");
    if (isNaN(jam) || jam < 12) continue;
    gtkSudah.add(p.gtk_id);
    hasil[mapel] = (hasil[mapel] ?? 0) + 12;
  }
  return hasil;
}
