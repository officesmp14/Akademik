import { SupabaseClient } from "@supabase/supabase-js";
import { Nilai } from "@/types/nilai";

/** Keterangan huruf berdasarkan rentang skor TETAP (sama untuk semua mapel). */
export function getKeterangan(nilai: number): "A" | "B" | "C" | "D" {
  if (nilai >= 88) return "A";
  if (nilai >= 74) return "B";
  if (nilai >= 60) return "C";
  return "D";
}

/** Fase Kurikulum Merdeka -- untuk SMP (kelas VII-IX) selalu Fase D. */
export function getFase(_rombel: string): string {
  return "D";
}

/** Format tanggal Indonesia, mis. "04 April 2026". */
export function formatTanggalIndonesia(date: Date = new Date()): string {
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
}

/** Sebagian akun guru diisi datagtk.nip dengan teks bukan angka (mis. "dewi")
 *  cuma supaya bisa login -- di raport, NIP yang bukan angka murni dianggap
 *  tidak sah dan tidak ditampilkan sama sekali. */
export function isValidNip(nip: string): boolean {
  return /^\d+$/.test(nip.trim());
}

export type WaliKelasInfo = { nama: string | null; nip: string | null; label: string };

/** Cari data wali kelas (nama, NIP, label NIP/NIPP3K) untuk satu rombel --
 *  null kalau rombel itu belum ada wali kelasnya. */
export async function fetchWaliKelasInfo(
  supabase: SupabaseClient,
  rombel: string
): Promise<WaliKelasInfo | null> {
  const { data: waliRow } = await supabase.from("wali_kelas").select("gtk_id").eq("rombel", rombel).maybeSingle();
  if (!waliRow?.gtk_id) return null;

  const { data: gtk } = await supabase
    .from("datagtk")
    .select("nama, nip, status_kepegawaian, gelar_belakang")
    .eq("id", waliRow.gtk_id)
    .maybeSingle();
  if (!gtk) return null;

  return {
    nama: gtk.nama + ", " + (gtk.gelar_belakang || ""),
    nip: gtk.nip,
    label: gtk.status_kepegawaian === "PPPK" ? "NIPPPPK" : "NIP",
  };
}

export type SiswaRingkasNilai = {
  id: string;
  nama: string | null;
  nipd: string | null;
  nisn: string | null;
  agama: string | null;
};

export type MapelRingkas = { id: number; mapel: string; singkatan?: string | null };

export type BarisNilai = { mapel: string; nilai: number | null; keterangan: string };

export type RingkasanSiswa = {
  siswa: SiswaRingkasNilai;
  baris: BarisNilai[];
  total: number | null;
  rataRata: number | null;
  peringkat: number | null;
};

/** Mapel Agama tercatat sebagai mata pelajaran terpisah per agama (Agama
 *  Islam, Agama Protestan, dst) -- di rapor/rekap cukup ditampilkan SATU
 *  baris/kolom "Agama" berisi nilai dari mapel yang sesuai agama siswa itu
 *  sendiri. */
export const AGAMA_MAPEL_BY_AGAMA: Record<string, string> = {
  Islam: "Agama Islam",
  Kristen: "Agama Protestan",
  Katholik: "Agama Katolik",
  Budha: "Agama Budha",
  Hindu: "Agama Hindu",
  Konghucu: "Agama Konghucu",
};

export function isMapelAgama(nama: string): boolean {
  return nama.startsWith("Agama ");
}

/** Nilai STS ditampilkan APA ADANYA (nilai murni STS/Susulan/Remedial yang
 *  tertinggi), bukan nilai akhir gabungan Formatif + Sumatif Materi + SA. */
export function getEffectiveSts(rows: Nilai[]): number | null {
  const vals = rows
    .filter((r) => r.jenis === "sts" || r.jenis === "susulan_sts" || r.jenis === "remedial_sts")
    .map((r) => r.nilai);
  return vals.length > 0 ? Math.max(...vals) : null;
}

/** Bangun ringkasan nilai STS per siswa (baris per mapel + total + rata-rata),
 *  dengan mapel Agama digabung jadi satu baris "Agama". Peringkat BELUM
 *  dihitung di sini -- pakai hitungPeringkat() sesudahnya. */
export function hitungRingkasanSiswa(
  siswaList: SiswaRingkasNilai[],
  mapelList: MapelRingkas[],
  nilaiRows: Nilai[]
): RingkasanSiswa[] {
  return siswaList.map((s) => {
    const nonAgamaBaris: BarisNilai[] = mapelList
      .filter((m) => !isMapelAgama(m.mapel))
      .map((m) => {
        const rows = nilaiRows.filter((r) => r.siswa_id === s.id && r.mapel_id === m.id);
        const effectiveSts = getEffectiveSts(rows);

        return {
          mapel: m.mapel,
          nilai: effectiveSts,
          keterangan: effectiveSts !== null ? getKeterangan(effectiveSts) : "-",
        };
      });

    const adaMapelAgama = mapelList.some((m) => isMapelAgama(m.mapel));
    const agamaBaris: BarisNilai[] = adaMapelAgama
      ? (() => {
          const agamaMapelNama = s.agama ? AGAMA_MAPEL_BY_AGAMA[s.agama] : undefined;
          const agamaMapel = agamaMapelNama ? mapelList.find((m) => m.mapel === agamaMapelNama) : undefined;
          const rows = agamaMapel
            ? nilaiRows.filter((r) => r.siswa_id === s.id && r.mapel_id === agamaMapel.id)
            : [];
          const effectiveSts = getEffectiveSts(rows);
          return [
            {
              mapel: "Agama",
              nilai: effectiveSts,
              keterangan: effectiveSts !== null ? getKeterangan(effectiveSts) : "-",
            },
          ];
        })()
      : [];

    const baris: BarisNilai[] = [...agamaBaris, ...nonAgamaBaris];

    const nilaiValid = baris.filter((b) => b.nilai !== null).map((b) => b.nilai!) as number[];
    const total = nilaiValid.length > 0 ? nilaiValid.reduce((a, b) => a + b, 0) : null;
    const rataRata = total !== null ? Math.round((total / nilaiValid.length) * 100) / 100 : null;

    return { siswa: s, baris, total, rataRata, peringkat: null };
  });
}

/** Isi peringkat berdasarkan rata-rata (ranking standar: nilai sama = peringkat sama). */
export function hitungPeringkat(summaries: RingkasanSiswa[]): RingkasanSiswa[] {
  const withRata = summaries
    .filter((s) => s.rataRata !== null)
    .sort((a, b) => (b.rataRata! - a.rataRata!));

  let rank = 0;
  let lastVal: number | null = null;
  const rankMap: Record<string, number> = {};
  for (const s of withRata) {
    if (s.rataRata !== lastVal) {
      rank += 1;
      lastVal = s.rataRata;
    }
    rankMap[s.siswa.id] = rank;
  }

  return summaries.map((s) => ({ ...s, peringkat: rankMap[s.siswa.id] ?? null }));
}
