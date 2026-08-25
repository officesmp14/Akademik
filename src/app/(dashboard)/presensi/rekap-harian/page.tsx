"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRole } from "@/lib/role-context";
import { Pelajaran } from "@/types/nilai";
import { STATUS_PRESENSI_OPTIONS, StatusPresensi } from "@/types/presensi";
import { Loader2 } from "lucide-react";

type SiswaRingkas = { id: string; nama: string | null };

type PresensiRow = {
  siswa_id: string;
  mapel_id: number;
  jam_ke: number;
  status: StatusPresensi;
};

function todayStr() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function RekapHarianPage() {
  const { waliKelasRombel } = useRole();
  const [tanggal, setTanggal] = useState(todayStr());
  const [pelajaranMap, setPelajaranMap] = useState<Map<number, Pelajaran>>(new Map());
  const [siswaList, setSiswaList] = useState<SiswaRingkas[]>([]);
  const [presensiRows, setPresensiRows] = useState<PresensiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMapel() {
      const supabase = createClient();
      const { data } = await supabase.from("pelajaran").select("*");
      setPelajaranMap(new Map((data ?? []).map((p) => [p.id, p])));
    }
    fetchMapel();
  }, []);

  useEffect(() => {
    async function loadData() {
      if (!waliKelasRombel || !tanggal) return;
      setLoading(true);
      setError(null);
      const supabase = createClient();

      const [siswaRes, presensiRes] = await Promise.all([
        supabase
          .from("siswa01")
          .select("id, nama")
          .eq("rombel", waliKelasRombel)
          .eq("status_siswa", "Aktif")
          .order("nama", { ascending: true }),
        supabase
          .from("presensi")
          .select("siswa_id, mapel_id, jam_ke, status")
          .eq("rombel", waliKelasRombel)
          .eq("tanggal", tanggal),
      ]);

      if (siswaRes.error) {
        setError(siswaRes.error.message);
        setLoading(false);
        return;
      }
      if (presensiRes.error) {
        setError(presensiRes.error.message);
        setLoading(false);
        return;
      }

      setSiswaList(siswaRes.data ?? []);
      setPresensiRows((presensiRes.data ?? []) as PresensiRow[]);
      setLoading(false);
    }
    loadData();
  }, [waliKelasRombel, tanggal]);

  // Mapel yang ada presensinya hari itu, diurutkan berdasarkan jam ke paling awal
  const mapelHariIni = Array.from(new Set(presensiRows.map((p) => p.mapel_id))).sort((a, b) => {
    const minA = Math.min(...presensiRows.filter((p) => p.mapel_id === a).map((p) => p.jam_ke));
    const minB = Math.min(...presensiRows.filter((p) => p.mapel_id === b).map((p) => p.jam_ke));
    return minA - minB;
  });

  function selCell(siswaId: string, mapelId: number) {
    const entries = presensiRows
      .filter((p) => p.siswa_id === siswaId && p.mapel_id === mapelId)
      .sort((a, b) => a.jam_ke - b.jam_ke);
    if (entries.length === 0) return null;
    return {
      text: entries.map((e) => `${e.jam_ke}/${e.status}`).join(", "),
      semuaHadir: entries.every((e) => e.status === "H"),
    };
  }

  if (!waliKelasRombel) {
    return (
      <div className="p-6 md:p-8 max-w-3xl mx-auto">
        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-6">
          <h1 className="text-lg font-semibold text-amber-800 dark:text-amber-400 mb-2">Khusus Wali Kelas</h1>
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Halaman ini hanya dapat diakses oleh wali kelas untuk memantau kelasnya sendiri.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-1">Rekap Presensi Harian</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
        Kehadiran siswa kelas {waliKelasRombel} per jam pelajaran pada tanggal terpilih
      </p>

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <input
          type="date"
          value={tanggal}
          onChange={(e) => setTanggal(e.target.value)}
          className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
      ) : siswaList.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-10 text-center text-slate-400 dark:text-slate-500">
          Tidak ada siswa aktif di kelas ini.
        </div>
      ) : mapelHariIni.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-10 text-center text-slate-400 dark:text-slate-500">
          Belum ada data presensi untuk tanggal ini.
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40 text-left text-slate-500 dark:text-slate-400">
                <th className="px-3 py-2.5 font-medium">No</th>
                <th className="px-3 py-2.5 font-medium">Nama</th>
                {mapelHariIni.map((mapelId) => (
                  <th key={mapelId} className="px-3 py-2.5 font-medium text-center leading-tight">
                    <div>{pelajaranMap.get(mapelId)?.mapel ?? "Mapel"}</div>
                    <div className="text-[10px] font-normal text-slate-400 dark:text-slate-500">Jam ke</div>
                  </th>
                ))}
                <th className="px-3 py-2.5 font-medium text-center">Persentase Kehadiran</th>
              </tr>
            </thead>
            <tbody>
              {siswaList.map((s, idx) => {
                const ownRows = presensiRows.filter((p) => p.siswa_id === s.id);
                const hadir = ownRows.filter((p) => p.status === "H").length;
                const persenHadir =
                  ownRows.length > 0 ? Math.round((hadir / ownRows.length) * 1000) / 10 : null;
                return (
                  <tr key={s.id} className="border-b border-slate-100 dark:border-slate-700/60 last:border-0">
                    <td className="px-3 py-2 text-slate-500 dark:text-slate-400">{idx + 1}</td>
                    <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-200">{s.nama}</td>
                    {mapelHariIni.map((mapelId) => {
                      const cell = selCell(s.id, mapelId);
                      return (
                        <td
                          key={mapelId}
                          className={`px-3 py-2 text-center ${
                            !cell
                              ? "text-slate-300 dark:text-slate-600"
                              : cell.semuaHadir
                                ? "text-slate-600 dark:text-slate-300"
                                : "text-red-600 dark:text-red-400 font-medium"
                          }`}
                        >
                          {cell?.text ?? "-"}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-center">
                      {persenHadir === null ? (
                        <span className="text-slate-300 dark:text-slate-600">-</span>
                      ) : (
                        <span
                          className={
                            persenHadir >= 90
                              ? "text-emerald-600 dark:text-emerald-400 font-medium"
                              : persenHadir >= 75
                                ? "text-amber-600 dark:text-amber-400 font-medium"
                                : "text-red-600 dark:text-red-400 font-medium"
                          }
                        >
                          {persenHadir}%
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
        {STATUS_PRESENSI_OPTIONS.map((s) => (
          <span key={s.value}>
            <span className="font-semibold text-slate-700 dark:text-slate-300">{s.value}</span>=
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
