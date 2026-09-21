"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { compareKelas } from "@/lib/rekap-siswa";
import { getTahunAjaranSaatIni } from "@/types/nilai";
import {
  fetchNilaiRekapData,
  formatNilai,
  hitungJumlahRataRata,
  hitungRank,
  NilaiRekapData,
} from "@/lib/nilai-rekap";
import { Loader2, Trophy } from "lucide-react";

const EMPTY_DATA: NilaiRekapData = { siswaList: [], bobotRapor: null, rataRataMap: {}, ujianSklMap: {} };
const BATAS_PERINGKAT_KELAS = 3;

export default function PeringkatPage() {
  const [tahunAjaran, setTahunAjaran] = useState(getTahunAjaranSaatIni());
  const [data, setData] = useState<NilaiRekapData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data: result, error: err } = await fetchNilaiRekapData(supabase, { tahunAjaran, kelasFilter: "" });
    setData(result);
    setError(err);
    setLoading(false);
  }, [tahunAjaran]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const siswaBernisn = data.siswaList.filter((s) => s.nisn);
  const nisnSemua = siswaBernisn.map((s) => s.nisn as string);
  const rankUmumMap = hitungRank(nisnSemua, data);

  const rombelList = Array.from(new Set(siswaBernisn.map((s) => s.rombel).filter((r): r is string => !!r))).sort(
    compareKelas
  );

  const rankKelasByRombel = new Map<string, Map<string, number>>();
  for (const rombel of rombelList) {
    const nisnKelas = siswaBernisn.filter((s) => s.rombel === rombel).map((s) => s.nisn as string);
    rankKelasByRombel.set(rombel, hitungRank(nisnKelas, data));
  }

  // Ambil 3 besar tiap kelas (berdasarkan peringkat kelas), lalu urutkan
  // tampilan per kelas dan per peringkat.
  const top3PerKelas = rombelList.flatMap((rombel) => {
    const rankKelasMap = rankKelasByRombel.get(rombel) ?? new Map();
    return siswaBernisn
      .filter((s) => s.rombel === rombel)
      .map((s) => ({ siswa: s, peringkatKelas: rankKelasMap.get(s.nisn as string) ?? null }))
      .filter((s): s is { siswa: typeof s.siswa; peringkatKelas: number } =>
        s.peringkatKelas !== null && s.peringkatKelas <= BATAS_PERINGKAT_KELAS
      )
      .sort((a, b) => a.peringkatKelas - b.peringkatKelas);
  });

  return (
    <div className="p-6 md:p-8">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-2">
        <Trophy className="h-5 w-5 text-amber-500" />
        Peringkat
      </h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
        3 besar tiap kelas IX berdasarkan Total Nilai (30% Ujian Sekolah + 70% Rapor), lengkap dengan peringkat
        kelas dan peringkat umum
      </p>

      <div className="flex flex-wrap gap-3 mb-5">
        <input
          value={tahunAjaran}
          onChange={(e) => setTahunAjaran(e.target.value)}
          className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm w-32 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="2026/2027"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg px-3 py-2 mb-4">
          {error}
        </p>
      )}

      {loading ? (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-10 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400 dark:text-slate-500" />
        </div>
      ) : top3PerKelas.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-10 text-center text-slate-400 dark:text-slate-500">
          Belum ada data nilai siswa kelas IX.
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40 text-left text-slate-500 dark:text-slate-400">
                <th className="px-3 py-2.5 font-medium">No</th>
                <th className="px-3 py-2.5 font-medium min-w-[180px]">Nama Siswa</th>
                <th className="px-3 py-2.5 font-medium text-center">Kelas</th>
                <th className="px-3 py-2.5 font-medium text-center">Total Nilai</th>
                <th className="px-3 py-2.5 font-medium text-center">Peringkat Kelas</th>
                <th className="px-3 py-2.5 font-medium text-center">Peringkat Umum</th>
              </tr>
            </thead>
            <tbody>
              {top3PerKelas.map(({ siswa, peringkatKelas }, idx) => {
                const { jumlah } = hitungJumlahRataRata(data, siswa.nisn as string);
                const peringkatUmum = rankUmumMap.get(siswa.nisn as string) ?? null;
                return (
                  <tr key={siswa.id} className="border-b border-slate-100 dark:border-slate-700/60 last:border-0">
                    <td className="px-3 py-2 text-slate-500 dark:text-slate-400">{idx + 1}</td>
                    <td className="px-3 py-2 font-medium">{siswa.nama}</td>
                    <td className="px-3 py-2 text-center text-slate-500 dark:text-slate-400">
                      {siswa.rombel || "-"}
                    </td>
                    <td className="px-3 py-2 text-center font-medium">{formatNilai(jumlah)}</td>
                    <td className="px-3 py-2 text-center font-medium">{peringkatKelas}</td>
                    <td className="px-3 py-2 text-center font-medium">{peringkatUmum ?? "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
