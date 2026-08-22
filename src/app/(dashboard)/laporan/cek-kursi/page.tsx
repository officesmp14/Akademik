"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { buildCekKursi, CekKursiRow, KAPASITAS_KELAS } from "@/lib/cek-kursi";
import { ChevronLeft, Loader2, Printer } from "lucide-react";

function rowStyle(status: CekKursiRow["status"]) {
  if (status === "kurang") return "bg-emerald-50 dark:bg-emerald-500/10";
  if (status === "lebih") return "bg-red-50 dark:bg-red-500/10";
  return "";
}

export default function CekKursiPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<CekKursiRow[]>([]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from("siswa01")
        .select("rombel")
        .eq("status_siswa", "Aktif");

      if (!error) {
        setRows(buildCekKursi((data ?? []).map((d) => d.rombel)));
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  return (
    <div className="p-6 md:p-8 print:p-0">
      <div className="flex items-center justify-between mb-4 print:hidden">
        <a href="/laporan"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
        >
          <ChevronLeft className="h-4 w-4" />
          Kembali ke Laporan
        </a>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          <Printer className="h-4 w-4" />
          Cetak
        </button>
      </div>

      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-1">Cek Kursi</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
        Kapasitas per kelas: <strong>{KAPASITAS_KELAS} siswa</strong> — dihitung dari siswa
        berstatus <strong>Aktif</strong>
      </p>

      {loading ? (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-10 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400 dark:text-slate-500" />
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40 text-left text-slate-500 dark:text-slate-400">
                <th className="px-4 py-3 font-medium w-12">No</th>
                <th className="px-4 py-3 font-medium">Kelas</th>
                <th className="px-4 py-3 font-medium text-center">Jumlah Siswa</th>
                <th className="px-4 py-3 font-medium">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-400 dark:text-slate-500">
                    Tidak ada data.
                  </td>
                </tr>
              ) : (
                rows.map((r, idx) => (
                  <tr
                    key={r.kelas}
                    className={`border-b border-slate-100 dark:border-slate-700/60 last:border-0 ${rowStyle(r.status)}`}
                  >
                    <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">{idx + 1}</td>
                    <td className="px-4 py-2.5 font-medium text-slate-800 dark:text-slate-200">{r.kelas}</td>
                    <td className="px-4 py-2.5 text-center text-slate-700 dark:text-slate-200">{r.jumlahSiswa}</td>
                    <td className="px-4 py-2.5 text-slate-700 dark:text-slate-200">{r.keterangan}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center gap-4 mt-4 text-xs text-slate-500 dark:text-slate-400 print:hidden">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 inline-block" />
          Masih ada slot kursi
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 inline-block" />
          Melebihi kapasitas
        </span>
      </div>
    </div>
  );
}
