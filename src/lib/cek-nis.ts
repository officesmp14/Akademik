// Format NIS (7 digit): AA B C DDD
// AA  = 2 digit terakhir tahun ajaran
// B   = jenis siswa: 1 = siswa baru, 2 = siswa pindahan/mutasi
// C   = semester masuk: 1 = ganjil, 2 = genap
// DDD = nomor urut 3 digit, reset tiap tahun ajaran baru (berbagi urutan
//       yang sama lintas jenis siswa & semester dalam satu tahun ajaran)
//
// Contoh: 2611001 -> tahun 26, siswa baru, semester ganjil, urut 001
//         2621002 -> tahun 26, siswa pindahan, semester ganjil, urut 002
//         2622003 -> tahun 26, siswa pindahan, semester genap, urut 003

const NIS_REGEX = /^(\d{2})(\d)(\d)(\d{3})$/;

export type ParsedNis = {
  nipd: string;
  tahunAjaran: string;
  jenis: "1" | "2";
  semester: "1" | "2";
  urut: number;
};

export function parseNis(nipd: string | null | undefined): ParsedNis | null {
  if (!nipd) return null;
  const trimmed = nipd.trim();
  const match = trimmed.match(NIS_REGEX);
  if (!match) return null;

  const [, tahunAjaran, jenis, semester, urut] = match;
  if (jenis !== "1" && jenis !== "2") return null;
  if (semester !== "1" && semester !== "2") return null;

  return {
    nipd: trimmed,
    tahunAjaran,
    jenis,
    semester,
    urut: parseInt(urut, 10),
  };
}

/** Kode 2 digit tahun ajaran yang sedang berjalan, mis. "26" untuk 2026. */
export function getTahunAjaranKodeSaatIni(date: Date = new Date()): string {
  // Tahun ajaran di Indonesia umumnya mulai bulan Juli.
  const bulan = date.getMonth() + 1; // 1-12
  const tahun = bulan >= 7 ? date.getFullYear() : date.getFullYear() - 1;
  return String(tahun).slice(-2);
}

export type SiswaNisEntry = {
  nisn: string | null;
  nipd: string | null;
  rombel: string | null;
  nama: string | null;
};

/** 5 siswa terakhir yang sudah diberi NIS pada tahun ajaran berjalan. */
export function getLast5Nis(
  siswa: SiswaNisEntry[],
  tahunAjaranKode: string
): (SiswaNisEntry & { parsed: ParsedNis })[] {
  const valid = siswa
    .map((s) => ({ ...s, parsed: parseNis(s.nipd) }))
    .filter(
      (s): s is SiswaNisEntry & { parsed: ParsedNis } =>
        s.parsed !== null && s.parsed.tahunAjaran === tahunAjaranKode
    );

  return valid.sort((a, b) => b.parsed.urut - a.parsed.urut).slice(0, 5);
}

/** Nomor urut berikutnya (belum dipakai) untuk tahun ajaran berjalan. */
export function getNomorUrutBerikutnya(
  allNipd: (string | null)[],
  tahunAjaranKode: string
): number {
  let max = 0;
  for (const nipd of allNipd) {
    const parsed = parseNis(nipd);
    if (parsed && parsed.tahunAjaran === tahunAjaranKode) {
      max = Math.max(max, parsed.urut);
    }
  }
  return max + 1;
}

/** Rangkai NIS lengkap dari komponen-komponennya. */
export function buildNis(
  tahunAjaranKode: string,
  jenis: "1" | "2",
  semester: "1" | "2",
  urut: number
): string {
  return `${tahunAjaranKode}${jenis}${semester}${String(urut).padStart(3, "0")}`;
}
