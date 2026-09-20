"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRole } from "@/lib/role-context";
import { compareKelas } from "@/lib/rekap-siswa";
import { getTahunAjaranSaatIni } from "@/types/nilai";
import { SEMUA_KOLOM_UJIAN } from "@/types/nilai-ujian-sekolah";
import {
  fetchNilaiRekapData,
  formatNilai,
  getTotalNilai,
  hitungJumlahRataRata,
  hitungRank,
  NilaiRekapData,
} from "@/lib/nilai-rekap";
import { Loader2, Search } from "lucide-react";

const EMPTY_DATA: NilaiRekapData = { siswaList: [], bobotRapor: null, rataRataMap: {}, ujianSklMap: {} };

export default function NilaiIjazahPage() {
  const { role, waliKelasRombel, moduleAccess } = useRole();
  const isFullAccessRole = role === "admin" || role === "kepala_sekolah";
  const hasModuleEdit = moduleAccess.some((a) => a.module === "nilai_ijazah" && a.can_edit);
  const fullSelectAccess = isFullAccessRole || hasModuleEdit;
  const lockedToOwnClass = !fullSelectAccess && Boolean(waliKelasRombel);

  const [tahunAjaran, setTahunAjaran] = useState(getTahunAjaranSaatIni());
  const [kelasOptions, setKelasOptions] = useState<string[]>([]);
  const [kelasFilter, setKelasFilter] = useState("");
  const [search, setSearch] = useState("");

  const [data, setData] = useState<NilaiRekapData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Kunci ke kelas sendiri untuk wali kelas IX yang tidak punya akses penuh
  useEffect(() => {
    if (lockedToOwnClass && waliKelasRombel) setKelasFilter(waliKelasRombel);
  }, [lockedToOwnClass, waliKelasRombel]);

  // Opsi kelas IX untuk combobox filter (cuma untuk yang boleh pilih bebas)
  useEffect(() => {
    if (lockedToOwnClass) return;
    async function fetchKelasOptions() {
      const supabase = createClient();
      const { data: rows } = await supabase
        .from("siswa01")
        .select("rombel")
        .like("rombel", "IX.%")
        .eq("status_siswa", "Aktif");
      const unique = Array.from(
        new Set((rows ?? []).map((r) => r.rombel).filter(Boolean) as string[])
      ).sort(compareKelas);
      setKelasOptions(unique);
    }
    fetchKelasOptions();
  }, [lockedToOwnClass]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data: result, error: err } = await fetchNilaiRekapData(supabase, { tahunAjaran, kelasFilter });
    setData(result);
    setError(err);
    setLoading(false);
  }, [tahunAjaran, kelasFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const nisnListLengkap = data.siswaList.filter((s) => s.nisn).map((s) => s.nisn as string);
  const rankMap = hitungRank(nisnListLengkap, data);

  const searchTrimmed = search.trim().toLowerCase();
  const filteredSiswaList = searchTrimmed
    ? data.siswaList.filter(
        (s) =>
          (s.nama || "").toLowerCase().includes(searchTrimmed) ||
          (s.nisn || "").toLowerCase().includes(searchTrimmed)
      )
    : data.siswaList;

  return (
    <div className="p-6 md:p-8">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-1">Nilai Ijazah</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
        Total Nilai (30% Ujian Sekolah + 70% Rapor) per mapel, dengan jumlah, rata-rata, dan peringkat
      </p>

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama atau NISN..."
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {!lockedToOwnClass && (
          <select
            value={kelasFilter}
            onChange={(e) => setKelasFilter(e.target.value)}
            className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Semua Kelas IX</option>
            {kelasOptions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        )}

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
      ) : filteredSiswaList.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-10 text-center text-slate-400 dark:text-slate-500">
          Tidak ada siswa kelas IX yang cocok.
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40 text-left text-slate-500 dark:text-slate-400">
                <th className="px-3 py-2.5 font-medium sticky left-0 bg-slate-50 dark:bg-slate-700/40">No</th>
                <th className="px-3 py-2.5 font-medium sticky left-10 bg-slate-50 dark:bg-slate-700/40 min-w-[180px]">
                  Nama
                </th>
                <th className="px-3 py-2.5 font-medium text-center">Kelas</th>
                {SEMUA_KOLOM_UJIAN.map((k) => (
                  <th key={k.key} className="px-3 py-2.5 font-medium text-center" title={k.label}>
                    {k.label}
                  </th>
                ))}
                <th className="px-3 py-2.5 font-medium text-center border-l border-slate-200 dark:border-slate-700">
                  Jumlah
                </th>
                <th className="px-3 py-2.5 font-medium text-center">Rata-rata</th>
                <th className="px-3 py-2.5 font-medium text-center">Rank</th>
              </tr>
            </thead>
            <tbody>
              {filteredSiswaList.map((s, idx) => {
                const { jumlah, rataRata } = s.nisn
                  ? hitungJumlahRataRata(data, s.nisn)
                  : { jumlah: null, rataRata: null };
                const rank = s.nisn ? rankMap.get(s.nisn) ?? null : null;
                return (
                  <tr key={s.id} className="border-b border-slate-100 dark:border-slate-700/60 last:border-0">
                    <td className="px-3 py-2 text-slate-500 dark:text-slate-400 sticky left-0 bg-white dark:bg-slate-800">
                      {idx + 1}
                    </td>
                    <td className="px-3 py-2 font-medium sticky left-10 bg-white dark:bg-slate-800">{s.nama}</td>
                    <td className="px-3 py-2 text-center text-slate-500 dark:text-slate-400">{s.rombel || "-"}</td>
                    {!s.nisn ? (
                      <td
                        colSpan={SEMUA_KOLOM_UJIAN.length + 3}
                        className="px-3 py-2 text-center text-xs text-amber-600 dark:text-amber-400"
                      >
                        NISN belum diisi — lengkapi dulu di Data Siswa
                      </td>
                    ) : (
                      <>
                        {SEMUA_KOLOM_UJIAN.map((k) => (
                          <td key={k.key} className="px-2 py-1.5 text-center">
                            {formatNilai(getTotalNilai(data, s.nisn!, k.key))}
                          </td>
                        ))}
                        <td className="px-2 py-1.5 text-center font-medium border-l border-slate-100 dark:border-slate-700/60">
                          {formatNilai(jumlah)}
                        </td>
                        <td className="px-2 py-1.5 text-center font-medium">{formatNilai(rataRata)}</td>
                        <td className="px-2 py-1.5 text-center font-medium">{rank ?? "-"}</td>
                      </>
                    )}
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
