"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  buildRekapPerKelas,
  buildRekapPerJenjang,
  buildRekapTotal,
  RekapRow,
  SiswaRingkas,
} from "@/lib/rekap-siswa";
import { ChevronLeft, Loader2, Printer } from "lucide-react";

function RekapTable({
  title,
  rows,
  showKelasColumn = true,
}: {
  title: string;
  rows: RekapRow[];
  showKelasColumn?: boolean;
}) {
  const totalSemua = rows.reduce(
    (acc, r) => ({
      l: acc.l + r.l,
      p: acc.p + r.p,
      islam: acc.islam + r.islam,
      kristen: acc.kristen + r.kristen,
      katolik: acc.katolik + r.katolik,
      hindu: acc.hindu + r.hindu,
      budha: acc.budha + r.budha,
      konghucu: acc.konghucu + r.konghucu,
      jumlah: acc.jumlah + r.jumlah,
    }),
    { l: 0, p: 0, islam: 0, kristen: 0, katolik: 0, hindu: 0, budha: 0, konghucu: 0, jumlah: 0 }
  );

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden mb-6">
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{title}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40 text-left text-slate-500 dark:text-slate-400">
              <th className="px-3 py-2.5 font-medium w-12">No</th>
              {showKelasColumn && <th className="px-3 py-2.5 font-medium">Kelas</th>}
              <th className="px-3 py-2.5 font-medium text-center">L</th>
              <th className="px-3 py-2.5 font-medium text-center">P</th>
              <th className="px-3 py-2.5 font-medium text-center">Islam</th>
              <th className="px-3 py-2.5 font-medium text-center">Kristen</th>
              <th className="px-3 py-2.5 font-medium text-center">Katolik</th>
              <th className="px-3 py-2.5 font-medium text-center">Hindu</th>
              <th className="px-3 py-2.5 font-medium text-center">Budha</th>
              <th className="px-3 py-2.5 font-medium text-center">Konghucu</th>
              <th className="px-3 py-2.5 font-medium text-center">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={showKelasColumn ? 11 : 10}
                  className="px-3 py-8 text-center text-slate-400 dark:text-slate-500"
                >
                  Tidak ada data.
                </td>
              </tr>
            ) : (
              rows.map((r, idx) => (
                <tr key={r.kelas} className="border-b border-slate-100 dark:border-slate-700/60 last:border-0">
                  <td className="px-3 py-2 text-slate-500 dark:text-slate-400">{idx + 1}</td>
                  {showKelasColumn && (
                    <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-200">{r.kelas}</td>
                  )}
                  <td className="px-3 py-2 text-center text-slate-600 dark:text-slate-300">{r.l}</td>
                  <td className="px-3 py-2 text-center text-slate-600 dark:text-slate-300">{r.p}</td>
                  <td className="px-3 py-2 text-center text-slate-600 dark:text-slate-300">{r.islam}</td>
                  <td className="px-3 py-2 text-center text-slate-600 dark:text-slate-300">{r.kristen}</td>
                  <td className="px-3 py-2 text-center text-slate-600 dark:text-slate-300">{r.katolik}</td>
                  <td className="px-3 py-2 text-center text-slate-600 dark:text-slate-300">{r.hindu}</td>
                  <td className="px-3 py-2 text-center text-slate-600 dark:text-slate-300">{r.budha}</td>
                  <td className="px-3 py-2 text-center text-slate-600 dark:text-slate-300">{r.konghucu}</td>
                  <td className="px-3 py-2 text-center font-medium text-slate-800 dark:text-slate-200">{r.jumlah}</td>
                </tr>
              ))
            )}
          </tbody>
          {rows.length > 0 && showKelasColumn && (
            <tfoot>
              <tr className="bg-slate-50 dark:bg-slate-700/40 border-t border-slate-200 dark:border-slate-700 font-semibold text-slate-800 dark:text-slate-200">
                <td className="px-3 py-2.5" colSpan={2}>
                  Total
                </td>
                <td className="px-3 py-2.5 text-center">{totalSemua.l}</td>
                <td className="px-3 py-2.5 text-center">{totalSemua.p}</td>
                <td className="px-3 py-2.5 text-center">{totalSemua.islam}</td>
                <td className="px-3 py-2.5 text-center">{totalSemua.kristen}</td>
                <td className="px-3 py-2.5 text-center">{totalSemua.katolik}</td>
                <td className="px-3 py-2.5 text-center">{totalSemua.hindu}</td>
                <td className="px-3 py-2.5 text-center">{totalSemua.budha}</td>
                <td className="px-3 py-2.5 text-center">{totalSemua.konghucu}</td>
                <td className="px-3 py-2.5 text-center">{totalSemua.jumlah}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

export default function RekapSiswaPage() {
  const [loading, setLoading] = useState(true);
  const [siswa, setSiswa] = useState<SiswaRingkas[]>([]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from("siswa01")
        .select("rombel, jk, agama")
        .eq("status_siswa", "Aktif");

      if (!error) {
        setSiswa(data ?? []);
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  const rekapPerKelas = buildRekapPerKelas(siswa);
  const rekapPerJenjang = buildRekapPerJenjang(siswa);
  const rekapTotal = buildRekapTotal(siswa);

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

      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-1">
        Rekap Siswa
      </h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
        Data siswa dengan status <strong>Aktif</strong>, berdasarkan jenis kelamin dan agama
      </p>

      {loading ? (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-10 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400 dark:text-slate-500" />
        </div>
      ) : (
        <>
          <RekapTable title="Rekap Per Kelas" rows={rekapPerKelas} />
          <RekapTable title="Rekap Per Jenjang" rows={rekapPerJenjang} />
          <RekapTable
            title="Rekap Keseluruhan"
            rows={[rekapTotal]}
            showKelasColumn={false}
          />
        </>
      )}
    </div>
  );
}
