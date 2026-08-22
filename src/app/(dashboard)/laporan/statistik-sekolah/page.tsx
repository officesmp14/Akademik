"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { buildRekapTotal, getJenjang, JENJANG_ORDER, SiswaRingkas } from "@/lib/rekap-siswa";
import { ChevronLeft, Loader2, Printer } from "lucide-react";

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
      <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{value}</p>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{label}</p>
    </div>
  );
}

export default function StatistikSekolahPage() {
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

  const rombelPerJenjang = new Map<string, Set<string>>();
  for (const s of siswa) {
    const rombel = s.rombel?.trim();
    if (!rombel) continue;
    const jenjang = getJenjang(rombel);
    if (!(jenjang in JENJANG_ORDER)) continue;
    if (!rombelPerJenjang.has(jenjang)) rombelPerJenjang.set(jenjang, new Set());
    rombelPerJenjang.get(jenjang)!.add(rombel);
  }
  const jumlahRombelVII = rombelPerJenjang.get("VII")?.size ?? 0;
  const jumlahRombelVIII = rombelPerJenjang.get("VIII")?.size ?? 0;
  const jumlahRombelIX = rombelPerJenjang.get("IX")?.size ?? 0;

  const rekapTotal = buildRekapTotal(siswa);

  return (
    <div className="p-6 md:p-8 print:p-0">
      <div className="flex items-center justify-between mb-4 print:hidden">
        <a
          href="/laporan"
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

      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-1">Statistik Rombel & Agama</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
        Data siswa dengan status <strong>Aktif</strong>
      </p>

      {loading ? (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-10 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400 dark:text-slate-500" />
        </div>
      ) : (
        <>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">Jumlah Rombel per Jenjang</p>
          <div className="grid sm:grid-cols-3 gap-4 mb-8">
            <StatCard label="Rombel Kelas VII" value={jumlahRombelVII} />
            <StatCard label="Rombel Kelas VIII" value={jumlahRombelVIII} />
            <StatCard label="Rombel Kelas IX" value={jumlahRombelIX} />
          </div>

          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">Jumlah Siswa Berdasarkan Agama</p>
          <div className="grid sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard label="Islam" value={rekapTotal.islam} />
            <StatCard label="Kristen" value={rekapTotal.kristen} />
            <StatCard label="Katolik" value={rekapTotal.katolik} />
            <StatCard label="Hindu" value={rekapTotal.hindu} />
            <StatCard label="Budha" value={rekapTotal.budha} />
            <StatCard label="Konghucu" value={rekapTotal.konghucu} />
          </div>
        </>
      )}
    </div>
  );
}
