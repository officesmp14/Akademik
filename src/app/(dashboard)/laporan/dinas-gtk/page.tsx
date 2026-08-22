"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/client";
import { Gtk, GtkPenugasanMengajar, STATUS_AKTIF_OPTIONS } from "@/types/gtk";
import { LAPORAN_DINAS_COLUMNS, buildLaporanDinasRows, LaporanDinasRow } from "@/lib/laporan-dinas-gtk";
import { ChevronLeft, Loader2, Printer, Download } from "lucide-react";

function rowKey(row: LaporanDinasRow): string {
  return `${row.gtk.id ?? ""}__${row.penugasan?.id ?? "none"}`;
}

export default function LaporanDinasGtkPage() {
  const [loading, setLoading] = useState(true);
  const [allGtk, setAllGtk] = useState<Gtk[]>([]);
  const [allPenugasan, setAllPenugasan] = useState<GtkPenugasanMengajar[]>([]);
  const [filterStatusAktif, setFilterStatusAktif] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const supabase = createClient();

      const [gtkRes, penugasanRes] = await Promise.all([
        supabase.from("datagtk").select("*"),
        supabase.from("gtk_penugasan_mengajar").select("*"),
      ]);

      setAllGtk((gtkRes.data ?? []) as Gtk[]);
      setAllPenugasan((penugasanRes.data ?? []) as GtkPenugasanMengajar[]);
      setLoading(false);
    }
    fetchData();
  }, []);

  const filteredGtk = useMemo(
    () => (filterStatusAktif ? allGtk.filter((g) => g.status_aktif === filterStatusAktif) : allGtk),
    [allGtk, filterStatusAktif]
  );

  const rows = useMemo(
    () => buildLaporanDinasRows(filteredGtk, allPenugasan),
    [filteredGtk, allPenugasan]
  );

  // Default-nya semua baris terpilih (perilaku sama seperti sebelum ada fitur checklist ini)
  useEffect(() => {
    setSelected(new Set(rows.map(rowKey)));
  }, [rows]);

  const selectedRows = rows.filter((r) => selected.has(rowKey(r)));
  const allSelected = rows.length > 0 && selected.size === rows.length;

  function toggleSelectAll() {
    setSelected(allSelected ? new Set() : new Set(rows.map(rowKey)));
  }

  function toggleRow(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // Print landscape khusus laporan ini saja (tidak memengaruhi print laporan lain)
  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = "@page { size: landscape; margin: 10mm; }";
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  function handleDownload() {
    const data = selectedRows.map((row) => {
      const obj: Record<string, string | number> = { NO: 0 };
      LAPORAN_DINAS_COLUMNS.forEach((col) => {
        obj[col.header] = col.get(row);
      });
      return obj;
    });
    // Isi ulang nomor urut yang benar (1, 2, 3, ...)
    data.forEach((d, idx) => (d.NO = idx + 1));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "GTK");
    XLSX.writeFile(wb, "Laporan-Dinas-GTK.xlsx");
  }

  return (
    <div className="p-6 md:p-8 max-w-full mx-auto print:p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 print:hidden">
        <a
          href="/laporan"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
        >
          <ChevronLeft className="h-4 w-4" />
          Kembali ke Laporan
        </a>
        <div className="flex gap-2">
          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <Download className="h-4 w-4" />
            Download Excel
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white text-sm font-medium px-4 py-2 hover:bg-indigo-700 transition-colors"
          >
            <Printer className="h-4 w-4" />
            Cetak
          </button>
        </div>
      </div>

      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-1">
        Laporan Dinas Pendidikan (Data GTK)
      </h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 print:hidden">
        Format kolom mengikuti file &quot;Master Update&quot; Dinas Pendidikan — data digabung
        otomatis dari data personal GTK dan penugasan mengajar. Total{" "}
        <strong>{rows.length}</strong> baris, <strong>{selectedRows.length}</strong> dipilih untuk
        dicetak/diunduh.
      </p>

      <div className="mb-4 print:hidden">
        <select
          value={filterStatusAktif}
          onChange={(e) => setFilterStatusAktif(e.target.value)}
          className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          {STATUS_AKTIF_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
          <option value="">Semua</option>
        </select>
      </div>

      {loading ? (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-10 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400 dark:text-slate-500" />
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-10 text-center text-slate-400 dark:text-slate-500">
          Tidak ada data.
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-x-auto">
          <table className="text-xs whitespace-nowrap">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40 text-left text-slate-500 dark:text-slate-400">
                <th className="px-3 py-2 font-medium sticky left-0 w-10 bg-slate-50 dark:bg-slate-700/40 print:hidden">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    className="accent-indigo-600"
                    title="Pilih semua"
                  />
                </th>
                <th className="px-3 py-2 font-medium sticky left-10 bg-slate-50 dark:bg-slate-700/40">NO</th>
                {LAPORAN_DINAS_COLUMNS.map((col, idx) => (
                  <th key={idx} className="px-3 py-2 font-medium">
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const key = rowKey(row);
                const isSelected = selected.has(key);
                return (
                <tr
                  key={key}
                  className={`border-b border-slate-100 dark:border-slate-700/60 last:border-0 hover:bg-slate-50/60 dark:hover:bg-slate-700/60 ${
                    isSelected ? "" : "print:hidden"
                  }`}
                >
                  <td className="px-3 py-2 sticky left-0 w-10 bg-white dark:bg-slate-800 print:hidden">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleRow(key)}
                      className="accent-indigo-600"
                    />
                  </td>
                  <td className="px-3 py-2 text-slate-500 dark:text-slate-400 sticky left-10 bg-white dark:bg-slate-800">{idx + 1}</td>
                  {LAPORAN_DINAS_COLUMNS.map((col, colIdx) => (
                    <td key={colIdx} className="px-3 py-2 text-slate-700 dark:text-slate-200">
                      {col.get(row) || "-"}
                    </td>
                  ))}
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
