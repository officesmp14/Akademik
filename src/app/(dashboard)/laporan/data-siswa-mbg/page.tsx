"use client";

import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/client";
import { compareKelas } from "@/lib/rekap-siswa";
import { ChevronLeft, Loader2, Printer, Download } from "lucide-react";

type SiswaMbg = {
  nama: string | null;
  jk: string | null;
  rombel: string | null;
  nisn: string | null;
};

type KelasGroup = {
  kelas: string;
  siswa: SiswaMbg[];
};

function groupByKelas(siswa: SiswaMbg[]): KelasGroup[] {
  const map = new Map<string, SiswaMbg[]>();

  for (const s of siswa) {
    const kelas = s.rombel?.trim() || "Tanpa Rombel";
    if (!map.has(kelas)) map.set(kelas, []);
    map.get(kelas)!.push(s);
  }

  const groups: KelasGroup[] = Array.from(map.entries()).map(([kelas, list]) => ({
    kelas,
    siswa: [...list].sort((a, b) =>
      (a.nama || "").localeCompare(b.nama || "", "id", { sensitivity: "base" })
    ),
  }));

  return groups.sort((a, b) => compareKelas(a.kelas, b.kelas));
}

// Kode singkat untuk label tab, mis. "VII.1" -> "71", "VIII.2" -> "82"
const ROMAWI_KE_ANGKA: Record<string, string> = { VII: "7", VIII: "8", IX: "9" };

function kelasKeKode(kelas: string): string {
  const [jenjang, sub] = kelas.split(".");
  const angka = ROMAWI_KE_ANGKA[jenjang];
  if (!angka || !sub) return kelas;
  return `${angka}${sub}`;
}

function sheetNameAman(nama: string): string {
  // Nama sheet Excel maksimal 31 karakter & tidak boleh berisi : \ / ? * [ ]
  return nama.replace(/[:\\/?*[\]]/g, "-").slice(0, 31);
}

function exportXlsx(groups: KelasGroup[], filename: string) {
  const wb = XLSX.utils.book_new();
  for (const g of groups) {
    const rows = g.siswa.map((s, idx) => ({
      No: idx + 1,
      Nama: s.nama || "-",
      "L/P": s.jk || "-",
      Kelas: g.kelas,
      NISN: s.nisn || "-",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, sheetNameAman(g.kelas));
  }
  XLSX.writeFile(wb, filename);
}

export default function DataSiswaMbgPage() {
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<KelasGroup[]>([]);
  const [total, setTotal] = useState(0);
  const [activeKelas, setActiveKelas] = useState<string | null>(null);
  const [printMode, setPrintMode] = useState<"single" | "all">("single");

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from("siswa01")
        .select("nama, jk, rombel, nisn")
        .eq("status_siswa", "Aktif");

      if (!error) {
        const list = data ?? [];
        const grouped = groupByKelas(list);
        setGroups(grouped);
        setTotal(list.length);
        if (grouped.length > 0) setActiveKelas(grouped[0].kelas);
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  const activeGroup = groups.find((g) => g.kelas === activeKelas) ?? null;

  function handlePrintSingle() {
    setPrintMode("single");
    setTimeout(() => window.print(), 50);
  }

  function handlePrintAll() {
    setPrintMode("all");
    setTimeout(() => window.print(), 50);
  }

  function handleDownloadSingle() {
    if (!activeGroup) return;
    exportXlsx([activeGroup], `Data-Siswa-MBG-${sheetNameAman(activeGroup.kelas)}.xlsx`);
  }

  function handleDownloadAll() {
    exportXlsx(groups, "Data-Siswa-MBG-Semua-Kelas.xlsx");
  }

  return (
    <div className="p-6 md:p-8 print:p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 print:hidden">
        <a href="/laporan"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
        >
          <ChevronLeft className="h-4 w-4" />
          Kembali ke Laporan
        </a>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleDownloadSingle}
            disabled={!activeGroup}
            className="inline-flex items-center gap-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Download Kelas Ini
          </button>
          <button
            onClick={handleDownloadAll}
            className="inline-flex items-center gap-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <Download className="h-4 w-4" />
            Download Semua Kelas
          </button>
          <button
            onClick={handlePrintSingle}
            disabled={!activeGroup}
            className="inline-flex items-center gap-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            <Printer className="h-4 w-4" />
            Cetak Kelas Ini
          </button>
          <button
            onClick={handlePrintAll}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white text-sm font-medium px-3 py-2 hover:bg-indigo-700 transition-colors"
          >
            <Printer className="h-4 w-4" />
            Cetak Semua Kelas
          </button>
        </div>
      </div>

      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-1">Data Siswa MBG</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 print:hidden">
        Data siswa untuk kebutuhan panitia Makan Bergizi Gratis (MBG) — status{" "}
        <strong>Aktif</strong> — total <strong>{total}</strong> siswa
      </p>

      {loading ? (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-10 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400 dark:text-slate-500" />
        </div>
      ) : groups.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-10 text-center text-slate-400 dark:text-slate-500">
          Tidak ada data.
        </div>
      ) : (
        <>
          {/* Tab per kelas */}
          <div className="flex flex-wrap gap-1.5 mb-5 print:hidden">
            {groups.map((g) => (
              <button
                key={g.kelas}
                onClick={() => setActiveKelas(g.kelas)}
                className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activeKelas === g.kelas
                    ? "bg-indigo-600 text-white"
                    : "bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                }`}
                title={`Kelas ${g.kelas}`}
              >
                {kelasKeKode(g.kelas)}
              </button>
            ))}
          </div>

          {groups.map((group) => (
            <div
              key={group.kelas}
              className={
                group.kelas === activeKelas
                  ? "block"
                  : printMode === "all"
                    ? "hidden print:block"
                    : "hidden"
              }
            >
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden mb-6 break-inside-avoid">
                <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Kelas {group.kelas}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{group.siswa.length} siswa</p>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40 text-left text-slate-500 dark:text-slate-400">
                      <th className="px-4 py-2.5 font-medium w-12">No</th>
                      <th className="px-4 py-2.5 font-medium">Nama</th>
                      <th className="px-4 py-2.5 font-medium text-center w-16">L/P</th>
                      <th className="px-4 py-2.5 font-medium">Kelas</th>
                      <th className="px-4 py-2.5 font-medium">NISN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.siswa.map((s, idx) => (
                      <tr key={`${group.kelas}-${idx}`} className="border-b border-slate-100 dark:border-slate-700/60 last:border-0">
                        <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{idx + 1}</td>
                        <td className="px-4 py-2 font-medium text-slate-800 dark:text-slate-200">{s.nama || "-"}</td>
                        <td className="px-4 py-2 text-center text-slate-600 dark:text-slate-300">{s.jk || "-"}</td>
                        <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{group.kelas}</td>
                        <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{s.nisn || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
