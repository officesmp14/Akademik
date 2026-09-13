import { AGAMA_KOLOM, MapelKolomKey, AgamaKolomKey, KetidakhadiranKolomKey } from "@/types/nilai-leger";

/** Mapel non-agama: label di header leger e-Rapor -> kunci kolom
 *  `nilai_leger`. "BI" sengaja tidak dimasukkan di sini karena dipakai
 *  dua kali di leger (Bahasa Indonesia & Bahasa Inggris) -- ditangani
 *  terpisah lewat urutan kemunculan (occurrence) di parseLegerHeader(). */
const NON_RELIGION_LABEL_TO_KEY: Record<string, MapelKolomKey> = {
  PP: "pkn",
  PKN: "pkn",
  MU: "mtk",
  MTK: "mtk",
  IPAI: "ipa",
  IPA: "ipa",
  IPSI: "ips",
  IPS: "ips",
  PJODK: "pjok",
  PJOK: "pjok",
  I: "infor",
  P: "prakarya",
};

const AGAMA_URAIAN_TO_KEY: Record<string, AgamaKolomKey> = Object.fromEntries(
  AGAMA_KOLOM.map((a) => [a.agama, a.key])
);

export type LegerColumn =
  | { col: number; label: string; kind: "agama" }
  | { col: number; label: string; kind: "mapel"; key: MapelKolomKey }
  | { col: number; label: string; kind: "ketidakhadiran"; key: KetidakhadiranKolomKey }
  | { col: number; label: string; kind: "unknown" };

export type LegerParseResult = {
  columns: LegerColumn[];
  namaCol: number;
  nisnCol: number;
  nisCol: number;
  dataStartRow: number;
  dataRows: string[][];
  kelasOld: string | null;
};

function findHeaderRow(rows: string[][]): number {
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].some((cell) => (cell || "").trim().toUpperCase() === "NAMA SISWA")) {
      return i;
    }
  }
  return -1;
}

function findCol(row: string[], label: string): number {
  return row.findIndex((cell) => (cell || "").trim().toUpperCase() === label.toUpperCase());
}

const GRADE_TO_ROMAN: Record<string, string> = { "7": "VII", "8": "VIII", "9": "IX" };

/** Baca baris "Kelas : 7.1" di kop leger (sebelum header tabel) dan
 *  ubah ke format rombel yang dipakai siswa01 ("VII.1"). Kalau
 *  formatnya tidak dikenali, dikembalikan apa adanya (tanpa konversi). */
function parseKelasFromFile(rows: string[][], headerRow: number): string | null {
  for (let r = 0; r < headerRow; r++) {
    const labelIdx = rows[r]?.findIndex((cell) => (cell || "").trim().toUpperCase() === "KELAS");
    if (labelIdx === undefined || labelIdx === -1) continue;

    const rawValue = rows[r]
      .slice(labelIdx + 1)
      .find((cell) => (cell || "").trim() !== "");
    if (!rawValue) return null;

    const cleaned = rawValue.trim().replace(/^:\s*/, "");
    const match = cleaned.match(/^(\d+)(\..+)$/);
    if (match && GRADE_TO_ROMAN[match[1]]) {
      return GRADE_TO_ROMAN[match[1]] + match[2];
    }
    return cleaned || null;
  }
  return null;
}

/** Cari kolom dengan label tertentu di beberapa baris sub-header sekaligus
 *  (baris sub-header "Sakit"/"Izin"/"Alpa" bisa beda baris dari baris
 *  singkatan mapel, jadi tidak bisa diasumsikan satu baris tetap). */
function findColAcrossRows(rows: string[][], fromRow: number, toRowExclusive: number, label: string): number {
  for (let r = fromRow; r < toRowExclusive; r++) {
    const col = findCol(rows[r] ?? [], label);
    if (col !== -1) return col;
  }
  return -1;
}

/** Parse struktur header leger e-Rapor (baris judul, kop, & header
 *  bertingkat MATA PELAJARAN/Ketidakhadiran) untuk menemukan kolom
 *  NISN/NIS/Nama, kolom tiap mapel & ketidakhadiran, dan baris awal data
 *  siswa. */
export function parseLegerHeader(rows: string[][]): LegerParseResult | { error: string } {
  const headerRow = findHeaderRow(rows);
  if (headerRow === -1) {
    return { error: 'Tidak menemukan baris header ("NAMA SISWA"). Pastikan ini file leger e-Rapor.' };
  }

  const header = rows[headerRow];
  const namaCol = findCol(header, "NAMA SISWA");
  const nisnCol = findCol(header, "NISN");
  const nisCol = findCol(header, "NIS");
  const mapelStartCol = findCol(header, "MATA PELAJARAN");
  const ketidakhadiranStartCol = findCol(header, "Ketidakhadiran");
  const ekskulCol = findCol(header, "Ekstra Kurikuler");

  if (namaCol === -1 || nisnCol === -1 || mapelStartCol === -1) {
    return { error: 'Header tidak lengkap (butuh kolom "NAMA SISWA", "NISN", dan "MATA PELAJARAN").' };
  }

  const mapelEndCol = ketidakhadiranStartCol !== -1 ? ketidakhadiranStartCol : header.length;
  const abbrevRow = rows[headerRow + 1] ?? [];

  const columns: LegerColumn[] = [];
  let biCount = 0;
  for (let col = mapelStartCol; col < mapelEndCol; col++) {
    const label = (abbrevRow[col] || "").trim();
    if (!label) continue;

    if (/DBP$/i.test(label)) {
      columns.push({ col, label, kind: "agama" });
      continue;
    }

    if (label.toUpperCase() === "BI") {
      biCount += 1;
      // Kemunculan pertama = Bahasa Indonesia (selalu sebelum Matematika/IPA/IPS
      // di urutan leger), kemunculan kedua = Bahasa Inggris (selalu setelah IPS).
      columns.push({ col, label, kind: "mapel", key: biCount === 1 ? "bind" : "bing" });
      continue;
    }

    const key = NON_RELIGION_LABEL_TO_KEY[label.toUpperCase()];
    if (key) {
      columns.push({ col, label, kind: "mapel", key });
    } else {
      columns.push({ col, label, kind: "unknown" });
    }
  }

  // Kolom Ketidakhadiran (Sakit/Izin/Alpa) ada di sub-header baris lain
  // (bisa beda dari baris singkatan mapel), dicari di rentang baris
  // antara header utama sampai sebelum data siswa mulai.
  if (ketidakhadiranStartCol !== -1) {
    const ketidakhadiranEndCol = ekskulCol !== -1 ? ekskulCol : header.length;
    const searchToRow = Math.min(headerRow + 6, rows.length);
    const labels: { label: string; key: KetidakhadiranKolomKey }[] = [
      { label: "Sakit", key: "sakit" },
      { label: "Izin", key: "izin" },
      { label: "Alpa", key: "alpa" },
    ];
    for (const { label, key } of labels) {
      const col = findColAcrossRows(rows, headerRow + 1, searchToRow, label);
      if (col !== -1 && col >= ketidakhadiranStartCol && col < ketidakhadiranEndCol) {
        columns.push({ col, label, kind: "ketidakhadiran", key });
      }
    }
  }

  // Baris data siswa dimulai dari baris pertama setelah header yang kolom
  // "No"-nya berisi angka "1" (jumlah baris sub-header di atas data bisa
  // beda-beda antar file, jadi dicari dinamis -- bukan diasumsikan tetap).
  let dataStartRow = -1;
  for (let r = headerRow + 1; r < rows.length; r++) {
    if ((rows[r][0] || "").trim() === "1") {
      dataStartRow = r;
      break;
    }
  }
  if (dataStartRow === -1) {
    return { error: "Tidak menemukan baris data siswa (kolom No dimulai dari 1)." };
  }

  const dataRows: string[][] = [];
  let expectedNo = 1;
  for (let r = dataStartRow; r < rows.length; r++) {
    const noCell = (rows[r][0] || "").trim();
    if (noCell !== String(expectedNo)) break;
    dataRows.push(rows[r]);
    expectedNo += 1;
  }

  const kelasOld = parseKelasFromFile(rows, headerRow);

  return { columns, namaCol, nisnCol, nisCol, dataStartRow, dataRows, kelasOld };
}

export type SiswaLookup = { nisn: string | null; nipd: string | null; agama: string | null };

export type ResolvedNilaiRow = { nisn: string; kelas_old: string | null } & Partial<
  Record<MapelKolomKey | AgamaKolomKey | KetidakhadiranKolomKey, number>
>;

export type ImportSummary = {
  matched: { nama: string; nisn: string }[];
  unmatched: { nama: string; nisn: string; rowNumber: number; reason: string }[];
  rows: ResolvedNilaiRow[];
  unknownColumns: string[];
  duplicateNisn: string[];
};

/** Cocokkan baris data leger ke siswa (lewat NISN, jatuh ke NIS/NIPD kalau
 *  NISN tidak ketemu) dan gabungkan jadi satu baris per siswa (kolom mapel
 *  + ketidakhadiran) -- termasuk kolom agama yang diselesaikan lewat agama
 *  siswa itu sendiri (bukan lewat posisi kolom, karena label kolom agama
 *  di leger e-Rapor bisa duplikat/ambigu, mis. "PAKDBP" dipakai untuk
 *  Kristen maupun Katolik). NISN dipakai sebagai kunci penyimpanan ke
 *  nilai_leger, jadi siswa yang cocok lewat NIS tapi tidak punya NISN di
 *  data kita tetap dilewati. */
export function resolveLegerRows(
  parsed: LegerParseResult,
  siswaList: SiswaLookup[]
): ImportSummary {
  const byNisn = new Map(siswaList.filter((s) => s.nisn).map((s) => [s.nisn!.trim(), s]));
  const byNipd = new Map(siswaList.filter((s) => s.nipd).map((s) => [s.nipd!.trim(), s]));

  const matched: ImportSummary["matched"] = [];
  const unmatched: ImportSummary["unmatched"] = [];
  const rows: ResolvedNilaiRow[] = [];
  const unknownColumns = new Set(
    parsed.columns.filter((c) => c.kind === "unknown").map((c) => c.label)
  );

  parsed.dataRows.forEach((row, idx) => {
    const nama = (row[parsed.namaCol] || "").trim();
    const nisn = (row[parsed.nisnCol] || "").trim();
    const nis = parsed.nisCol !== -1 ? (row[parsed.nisCol] || "").trim() : "";
    const rowNumber = parsed.dataStartRow + idx + 1;

    const siswa = (nisn && byNisn.get(nisn)) || (nis && byNipd.get(nis)) || null;
    if (!siswa) {
      unmatched.push({ nama, nisn, rowNumber, reason: "siswa tidak ditemukan" });
      return;
    }
    const siswaNisn = siswa.nisn?.trim();
    if (!siswaNisn) {
      unmatched.push({ nama, nisn, rowNumber, reason: "NISN siswa ini kosong di data kita" });
      return;
    }
    matched.push({ nama, nisn });

    const resolved: ResolvedNilaiRow = { nisn: siswaNisn, kelas_old: parsed.kelasOld };

    for (const c of parsed.columns) {
      const raw = (row[c.col] || "").trim();
      if (!raw) continue;

      const nilai = Number(raw);
      if (isNaN(nilai)) continue;

      if (c.kind === "agama") {
        const key = AGAMA_URAIAN_TO_KEY[siswa.agama ?? ""];
        if (key) resolved[key] = nilai;
      } else if (c.kind === "mapel" || c.kind === "ketidakhadiran") {
        resolved[c.key] = nilai;
      }
    }

    rows.push(resolved);
  });

  // Gabungkan baris duplikat (NISN yang sama muncul di >1 baris file --
  // biasa terjadi karena data-entry ganda di sumbernya). Kalau tidak
  // digabung, upsert satu batch bisa berisi kunci (nisn,tahun,semester)
  // yang sama dua kali dan Postgres menolak dengan error "ON CONFLICT
  // DO UPDATE command cannot affect row a second time".
  const byNisnMerged = new Map<string, ResolvedNilaiRow>();
  const duplicateNisn = new Set<string>();
  for (const r of rows) {
    if (byNisnMerged.has(r.nisn)) duplicateNisn.add(r.nisn);
    byNisnMerged.set(r.nisn, { ...byNisnMerged.get(r.nisn), ...r });
  }

  return {
    matched,
    unmatched,
    rows: Array.from(byNisnMerged.values()),
    unknownColumns: Array.from(unknownColumns),
    duplicateNisn: Array.from(duplicateNisn),
  };
}
