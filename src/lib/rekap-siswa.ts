export type RekapRow = {
  kelas: string;
  l: number;
  p: number;
  islam: number;
  kristen: number;
  katolik: number;
  hindu: number;
  budha: number;
  konghucu: number;
  jumlah: number;
};

function emptyRekap(kelas: string): RekapRow {
  return {
    kelas,
    l: 0,
    p: 0,
    islam: 0,
    kristen: 0,
    katolik: 0,
    hindu: 0,
    budha: 0,
    konghucu: 0,
    jumlah: 0,
  };
}

/** Mengelompokkan nilai agama (apa pun variasi penulisannya) ke kategori baku. */
export function classifyAgama(
  agama: string | null | undefined
): keyof Omit<RekapRow, "kelas" | "l" | "p" | "jumlah"> | null {
  if (!agama) return null;
  const v = agama.trim().toLowerCase();
  if (v === "islam") return "islam";
  if (v === "kristen" || v === "protestan" || v === "kristen protestan") return "kristen";
  if (v === "katolik" || v === "katholik" || v === "kristen katolik") return "katolik";
  if (v === "hindu") return "hindu";
  if (v === "budha" || v === "buddha") return "budha";
  if (v === "konghucu" || v === "khonghucu") return "konghucu";
  return null; // agama lain / tidak dikenali, tetap dihitung di jumlah total
}

/** Ambil kode jenjang dari nama rombel, mis. "VII.3" -> "VII". */
export function getJenjang(rombel: string): string {
  const trimmed = rombel.trim();
  const dotIndex = trimmed.indexOf(".");
  if (dotIndex === -1) return trimmed;
  return trimmed.slice(0, dotIndex);
}

export const JENJANG_ORDER: Record<string, number> = { VII: 1, VIII: 2, IX: 3 };

export function compareKelas(a: string, b: string): number {
  const [jenA, subA] = a.split(".");
  const [jenB, subB] = b.split(".");
  const orderA = JENJANG_ORDER[jenA] ?? 99;
  const orderB = JENJANG_ORDER[jenB] ?? 99;
  if (orderA !== orderB) return orderA - orderB;
  if (jenA !== jenB) return jenA.localeCompare(jenB);
  const numA = parseInt(subA ?? "0", 10);
  const numB = parseInt(subB ?? "0", 10);
  if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
  return (subA ?? "").localeCompare(subB ?? "");
}

function addSiswaToRekap(row: RekapRow, jk: string | null, agama: string | null) {
  if (jk === "L") row.l += 1;
  else if (jk === "P") row.p += 1;

  const kategori = classifyAgama(agama);
  if (kategori) row[kategori] += 1;

  row.jumlah += 1;
}

export type SiswaRingkas = {
  rombel: string | null;
  jk: string | null;
  agama: string | null;
};

export function buildRekapPerKelas(siswa: SiswaRingkas[]): RekapRow[] {
  const map = new Map<string, RekapRow>();

  for (const s of siswa) {
    const kelas = s.rombel?.trim() || "Tanpa Rombel";
    if (!map.has(kelas)) map.set(kelas, emptyRekap(kelas));
    addSiswaToRekap(map.get(kelas)!, s.jk, s.agama);
  }

  return Array.from(map.values()).sort((a, b) => compareKelas(a.kelas, b.kelas));
}

export function buildRekapPerJenjang(siswa: SiswaRingkas[]): RekapRow[] {
  const map = new Map<string, RekapRow>();

  for (const s of siswa) {
    const kelas = s.rombel?.trim() || "Tanpa Rombel";
    const jenjang = getJenjang(kelas);
    if (!map.has(jenjang)) map.set(jenjang, emptyRekap(jenjang));
    addSiswaToRekap(map.get(jenjang)!, s.jk, s.agama);
  }

  return Array.from(map.values()).sort((a, b) => {
    const orderA = JENJANG_ORDER[a.kelas] ?? 99;
    const orderB = JENJANG_ORDER[b.kelas] ?? 99;
    if (orderA !== orderB) return orderA - orderB;
    return a.kelas.localeCompare(b.kelas);
  });
}

export function buildRekapTotal(siswa: SiswaRingkas[]): RekapRow {
  const total = emptyRekap("Semua Kelas");
  for (const s of siswa) {
    addSiswaToRekap(total, s.jk, s.agama);
  }
  return total;
}
