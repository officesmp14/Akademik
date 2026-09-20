import { SupabaseClient } from "@supabase/supabase-js";
import { SEMUA_KOLOM_UJIAN, KolomUjianKey } from "@/types/nilai-ujian-sekolah";

export type SiswaRekap = {
  id: string;
  nama: string | null;
  nisn: string | null;
  nipd: string | null;
  rombel: string | null;
  agama: string | null;
};

export type NilaiPerMapel = Partial<Record<KolomUjianKey, number | null>>;

export type NilaiRekapData = {
  siswaList: SiswaRekap[];
  bobotRapor: number | null;
  rataRataMap: Record<string, NilaiPerMapel>;
  ujianSklMap: Record<string, NilaiPerMapel>;
};

// agama siswa01 -> nama kolom Agama di nilai_leger.
const AGAMA_KOLOM_LEGER_BY_AGAMA: Record<string, string> = {
  Islam: "islam",
  Kristen: "kristen",
  Katholik: "katolik",
  Budha: "budha",
};

// nilai_leger.infor === Informatika, beda penamaan dari nilai_ujian_sekolah.
function legerRowToKolomUjian(row: Record<string, number | null>, agama: string | null): NilaiPerMapel {
  const agamaKolom = agama ? AGAMA_KOLOM_LEGER_BY_AGAMA[agama] : undefined;
  return {
    agama: agamaKolom ? row[agamaKolom] ?? null : null,
    pkn: row.pkn ?? null,
    bind: row.bind ?? null,
    mtk: row.mtk ?? null,
    ipa: row.ipa ?? null,
    ips: row.ips ?? null,
    bing: row.bing ?? null,
    pjok: row.pjok ?? null,
    prakarya: row.prakarya ?? null,
    informatika: row.infor ?? null,
  };
}

function averageAcrossRows(rows: NilaiPerMapel[]): NilaiPerMapel {
  const result: NilaiPerMapel = {};
  for (const k of SEMUA_KOLOM_UJIAN) {
    const nilaiValid = rows.map((r) => r[k.key]).filter((v): v is number => v !== null && v !== undefined);
    result[k.key] = nilaiValid.length > 0 ? nilaiValid.reduce((a, b) => a + b, 0) / nilaiValid.length : null;
  }
  return result;
}

// Tahun ajaran kelas IX (input) + 2 tahun sebelumnya (kelas VIII, VII) --
// gabungan 3 tahun ajaran x 2 semester = 6 semester rapor.
export function tigaTahunAjaran(tahunAjaran: string): string[] {
  const [start] = tahunAjaran.split("/").map(Number);
  if (isNaN(start)) return [tahunAjaran];
  return [0, 1, 2].map((i) => `${start - i}/${start - i + 1}`);
}

export function bulatkanDua(value: number): number {
  return Math.round(value * 100) / 100;
}

export function formatNilai(value: number | null): string {
  if (value === null) return "-";
  const rounded = bulatkanDua(value);
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}

/** Ambil siswa kelas IX + rata-rata rapor 6 semester + Nilai SKL (Ujian
 *  Sekolah) untuk satu tahun ajaran/kelas -- dipakai bersama oleh halaman
 *  Nilai Rekap dan Nilai Ijazah supaya perhitungannya selalu konsisten. */
export async function fetchNilaiRekapData(
  supabase: SupabaseClient,
  opts: { tahunAjaran: string; kelasFilter: string }
): Promise<{ data: NilaiRekapData; error: string | null }> {
  const empty: NilaiRekapData = { siswaList: [], bobotRapor: null, rataRataMap: {}, ujianSklMap: {} };

  let siswaQuery = supabase
    .from("siswa01")
    .select("id, nama, nisn, nipd, rombel, agama")
    .like("rombel", "IX.%")
    .eq("status_siswa", "Aktif")
    .order("nama", { ascending: true });
  if (opts.kelasFilter) siswaQuery = siswaQuery.eq("rombel", opts.kelasFilter);

  const [bobotRes, siswaRes] = await Promise.all([
    supabase.from("pengaturan_skl").select("bobot_rapor").eq("id", 1).maybeSingle(),
    siswaQuery,
  ]);

  if (siswaRes.error) return { data: empty, error: siswaRes.error.message };

  const bobotRapor = bobotRes.data?.bobot_rapor ?? null;
  const siswaRows = (siswaRes.data ?? []) as SiswaRekap[];

  const nisnList = siswaRows.filter((s) => s.nisn).map((s) => s.nisn as string);
  if (nisnList.length === 0) {
    return { data: { siswaList: siswaRows, bobotRapor, rataRataMap: {}, ujianSklMap: {} }, error: null };
  }

  const tahunList = tigaTahunAjaran(opts.tahunAjaran);

  const [legerRes, ujianSklRes] = await Promise.all([
    supabase
      .from("nilai_leger")
      .select("nisn, islam, kristen, katolik, budha, pkn, bind, mtk, ipa, ips, bing, pjok, infor, prakarya")
      .in("nisn", nisnList)
      .in("tahun_ajaran", tahunList),
    supabase.from("nilai_skl_ujian_sekolah").select("*").in("nisn", nisnList).eq("tahun_ajaran", opts.tahunAjaran),
  ]);

  if (legerRes.error) return { data: { ...empty, siswaList: siswaRows, bobotRapor }, error: legerRes.error.message };
  if (ujianSklRes.error)
    return { data: { ...empty, siswaList: siswaRows, bobotRapor }, error: ujianSklRes.error.message };

  const agamaBySiswa = new Map(siswaRows.map((s) => [s.nisn, s.agama]));

  const legerBySiswa = new Map<string, Record<string, number | null>[]>();
  for (const row of legerRes.data ?? []) {
    const arr = legerBySiswa.get(row.nisn) ?? [];
    arr.push(row as Record<string, number | null>);
    legerBySiswa.set(row.nisn, arr);
  }

  const rataRataMap: Record<string, NilaiPerMapel> = {};
  for (const nisn of nisnList) {
    const rows = (legerBySiswa.get(nisn) ?? []).map((r) => legerRowToKolomUjian(r, agamaBySiswa.get(nisn) ?? null));
    rataRataMap[nisn] = averageAcrossRows(rows);
  }

  const ujianSklMap: Record<string, NilaiPerMapel> = {};
  for (const row of ujianSklRes.data ?? []) {
    ujianSklMap[row.nisn] = {
      agama: row.agama ?? null,
      pkn: row.pkn ?? null,
      bind: row.bind ?? null,
      mtk: row.mtk ?? null,
      ipa: row.ipa ?? null,
      ips: row.ips ?? null,
      bing: row.bing ?? null,
      pjok: row.pjok ?? null,
      prakarya: row.prakarya ?? null,
      informatika: row.informatika ?? null,
    };
  }

  return { data: { siswaList: siswaRows, bobotRapor, rataRataMap, ujianSklMap }, error: null };
}

export function getRataRata(data: NilaiRekapData, nisn: string, key: KolomUjianKey): number | null {
  return data.rataRataMap[nisn]?.[key] ?? null;
}

export function get70Persen(data: NilaiRekapData, nisn: string, key: KolomUjianKey): number | null {
  const v = getRataRata(data, nisn, key);
  if (v === null || data.bobotRapor === null) return null;
  return bulatkanDua(v * (data.bobotRapor / 100));
}

export function get30Persen(data: NilaiRekapData, nisn: string, key: KolomUjianKey): number | null {
  return data.ujianSklMap[nisn]?.[key] ?? null;
}

export function getTotalNilai(data: NilaiRekapData, nisn: string, key: KolomUjianKey): number | null {
  const a = get70Persen(data, nisn, key);
  const b = get30Persen(data, nisn, key);
  if (a === null && b === null) return null;
  return bulatkanDua((a ?? 0) + (b ?? 0));
}

/** Jumlah & rata-rata Total Nilai (30% + 70%) per siswa, lintas semua
 *  mapel -- nilai yang kosong tidak ikut dihitung (dipakai bersama oleh
 *  Nilai Ijazah dan Cetak Leger). */
export function hitungJumlahRataRata(
  data: NilaiRekapData,
  nisn: string
): { jumlah: number | null; rataRata: number | null } {
  const nilaiValid = SEMUA_KOLOM_UJIAN.map((k) => getTotalNilai(data, nisn, k.key)).filter(
    (v): v is number => v !== null
  );
  if (nilaiValid.length === 0) return { jumlah: null, rataRata: null };
  const jumlah = nilaiValid.reduce((a, b) => a + b, 0);
  return { jumlah: bulatkanDua(jumlah), rataRata: bulatkanDua(jumlah / nilaiValid.length) };
}

/** Rank berdasarkan rata-rata Total Nilai, dari SELURUH nisn yang diberikan
 *  -- ranking standar: nilai sama = rank sama, rank berikutnya melompat
 *  sesuai jumlah yang seri. */
export function hitungRank(nisnList: string[], data: NilaiRekapData): Map<string, number> {
  const withRataRata = nisnList
    .map((nisn) => ({ nisn, rataRata: hitungJumlahRataRata(data, nisn).rataRata }))
    .filter((s): s is { nisn: string; rataRata: number } => s.rataRata !== null)
    .sort((a, b) => b.rataRata - a.rataRata);

  let rank = 0;
  let lastVal: number | null = null;
  const rankMap = new Map<string, number>();
  for (const s of withRataRata) {
    if (s.rataRata !== lastVal) {
      rank += 1;
      lastVal = s.rataRata;
    }
    rankMap.set(s.nisn, rank);
  }
  return rankMap;
}
