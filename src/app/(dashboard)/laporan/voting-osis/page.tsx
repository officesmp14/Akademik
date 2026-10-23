"use client";

import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/client";
import { compareKelas } from "@/lib/rekap-siswa";
import { getPageNumbers } from "@/lib/pagination";
import { ChevronLeft, Download, Loader2 } from "lucide-react";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

type SiswaVoting = {
  id: string;
  nama: string | null;
  nisn: string | null;
  rombel: string | null;
};

function SiswaTab() {
  const [data, setData] = useState<SiswaVoting[]>([]);
  const [rombelOptions, setRombelOptions] = useState<string[]>([]);
  const [filterRombel, setFilterRombel] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      const supabase = createClient();

      const semua: SiswaVoting[] = [];
      const BATCH = 1000;
      for (let from = 0; ; from += BATCH) {
        let query = supabase
          .from("siswa01")
          .select("id, nama, nisn, rombel")
          .eq("status_siswa", "Aktif")
          .order("nama", { ascending: true })
          .range(from, from + BATCH - 1);
        if (filterRombel) query = query.eq("rombel", filterRombel);

        const { data, error } = await query;
        if (error) {
          setError(error.message);
          setLoading(false);
          return;
        }
        semua.push(...(data ?? []));
        if (!data || data.length < BATCH) break;
      }

      // Urut kelas (VII.1, VII.2, ... VIII.1, ...) lalu nama A-Z
      semua.sort(
        (a, b) =>
          compareKelas(a.rombel ?? "", b.rombel ?? "") ||
          (a.nama ?? "").localeCompare(b.nama ?? "", "id", { sensitivity: "base" })
      );
      setData(semua);
      setLoading(false);
    }
    fetchData();
  }, [filterRombel]);

  useEffect(() => {
    async function fetchRombelOptions() {
      const supabase = createClient();
      const { data } = await supabase.from("siswa01").select("rombel").not("rombel", "is", null);
      const unique = Array.from(new Set((data ?? []).map((r) => r.rombel).filter(Boolean) as string[])).sort(
        compareKelas
      );
      setRombelOptions(unique);
    }
    fetchRombelOptions();
  }, []);

  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const pageAwal = page * pageSize;
  const tampil = data.slice(pageAwal, pageAwal + pageSize);

  function handleExport() {
    const ws = XLSX.utils.aoa_to_sheet([
      ["No", "Kategori", "Nama", "NISN", "Kelas", "PIN"],
      ...data.map((s, idx) => [idx + 1, "Siswa", s.nama ?? "", s.nisn ?? "", s.rombel ?? "", s.nisn ?? ""]),
    ]);
    // NISN & PIN disimpan sebagai teks supaya angka 0 di depan tidak hilang
    for (let r = 1; r <= data.length; r++) {
      for (const col of ["D", "F"]) {
        const cell = ws[col + (r + 1)];
        if (cell) {
          cell.t = "s";
          cell.z = "@";
        }
      }
    }
    ws["!cols"] = [{ wch: 5 }, { wch: 10 }, { wch: 35 }, { wch: 14 }, { wch: 10 }, { wch: 14 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data Voting Osis");
    XLSX.writeFile(wb, `Data-Voting-Osis${filterRombel ? "-" + filterRombel : ""}.xlsx`);
  }

  const filterClass =
    "rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Siswa <strong>Aktif</strong> — total <strong>{data.length}</strong> siswa. PIN diisi dengan NISN.
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={data.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          Export ke Excel
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={pageSize}
          onChange={(e) => {
            setPageSize(Number(e.target.value));
            setPage(0);
          }}
          className={filterClass}
        >
          {PAGE_SIZE_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n} / halaman
            </option>
          ))}
        </select>
        <select
          value={filterRombel}
          onChange={(e) => {
            setFilterRombel(e.target.value);
            setPage(0);
          }}
          className={filterClass}
        >
          <option value="">Semua Kelas</option>
          {rombelOptions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
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
      ) : data.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-10 text-center text-slate-400 dark:text-slate-500">
          Tidak ada data siswa.
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40 text-left text-slate-500 dark:text-slate-400">
                  <th className="px-3 py-2.5 font-medium w-12">No</th>
                  <th className="px-3 py-2.5 font-medium">Kategori</th>
                  <th className="px-3 py-2.5 font-medium">Nama</th>
                  <th className="px-3 py-2.5 font-medium">NISN</th>
                  <th className="px-3 py-2.5 font-medium">Kelas</th>
                  <th className="px-3 py-2.5 font-medium">PIN</th>
                </tr>
              </thead>
              <tbody>
                {tampil.map((s, idx) => (
                  <tr key={s.id} className="border-b border-slate-100 dark:border-slate-700/60 last:border-0">
                    <td className="px-3 py-2 text-slate-500 dark:text-slate-400">{pageAwal + idx + 1}</td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-300">Siswa</td>
                    <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-200">{s.nama || "-"}</td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{s.nisn || "-"}</td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{s.rombel || "-"}</td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{s.nisn || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Menampilkan {pageAwal + 1}-{Math.min(pageAwal + pageSize, data.length)} dari {data.length}
            </p>
            <nav className="flex items-center gap-1 text-sm">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-2 py-1 font-medium tracking-wide text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-40"
              >
                PREVIOUS
              </button>
              {getPageNumbers(page + 1, totalPages).map((p, i) =>
                p === "..." ? (
                  <span key={`ellipsis-${i}`} className="px-1.5 text-slate-400 dark:text-slate-500 select-none">
                    ...
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p - 1)}
                    className={`h-7 w-7 rounded-full text-sm font-medium transition-colors ${
                      p === page + 1
                        ? "bg-indigo-600 text-white"
                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-2 py-1 font-medium tracking-wide text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-40"
              >
                NEXT
              </button>
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}

type GtkVoting = {
  id: string;
  nama: string | null;
  nip: string | null;
  jenis_ptk: string | null;
};

// Kategori: Guru & Kepala Sekolah = "Guru", Tenaga Kependidikan = "Staf TU"
function kategoriGtk(jenisPtk: string | null): string {
  return jenisPtk === "Tenaga Kependidikan" ? "Staf TU" : "Guru";
}

function GtkTab() {
  const [data, setData] = useState<GtkVoting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from("datagtk")
        .select("id, nama, nip, jenis_ptk")
        .eq("status_aktif", "Y")
        .order("nama", { ascending: true });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      setData((data ?? []) as GtkVoting[]);
      setLoading(false);
    }
    fetchData();
  }, []);

  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const pageAwal = page * pageSize;
  const tampil = data.slice(pageAwal, pageAwal + pageSize);

  function handleExport() {
    const ws = XLSX.utils.aoa_to_sheet([
      ["No", "Kategori", "NIP", "Nama", "PIN"],
      ...data.map((g, idx) => [idx + 1, kategoriGtk(g.jenis_ptk), g.nip ?? "", g.nama ?? "", g.nip ?? ""]),
    ]);
    // NIP & PIN (kolom C dan E) disimpan sebagai teks supaya angka panjang tidak rusak
    for (let r = 1; r <= data.length; r++) {
      for (const col of ["C", "E"]) {
        const cell = ws[col + (r + 1)];
        if (cell) {
          cell.t = "s";
          cell.z = "@";
        }
      }
    }
    ws["!cols"] = [{ wch: 5 }, { wch: 12 }, { wch: 22 }, { wch: 35 }, { wch: 22 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data Voting Osis GTK");
    XLSX.writeFile(wb, "Data-Voting-Osis-GTK.xlsx");
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          GTK <strong>Aktif</strong> — total <strong>{data.length}</strong> orang. PIN diisi dengan NIP.
        </p>
        <button
          onClick={handleExport}
          disabled={data.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          Export ke Excel
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={pageSize}
          onChange={(e) => {
            setPageSize(Number(e.target.value));
            setPage(0);
          }}
          className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {PAGE_SIZE_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n} / halaman
            </option>
          ))}
        </select>
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
      ) : data.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-10 text-center text-slate-400 dark:text-slate-500">
          Tidak ada data GTK aktif.
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40 text-left text-slate-500 dark:text-slate-400">
                  <th className="px-3 py-2.5 font-medium w-12">No</th>
                  <th className="px-3 py-2.5 font-medium">Kategori</th>
                  <th className="px-3 py-2.5 font-medium">NIP</th>
                  <th className="px-3 py-2.5 font-medium">Nama</th>
                  <th className="px-3 py-2.5 font-medium">PIN</th>
                </tr>
              </thead>
              <tbody>
                {tampil.map((g, idx) => (
                  <tr key={g.id} className="border-b border-slate-100 dark:border-slate-700/60 last:border-0">
                    <td className="px-3 py-2 text-slate-500 dark:text-slate-400">{pageAwal + idx + 1}</td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{kategoriGtk(g.jenis_ptk)}</td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{g.nip || "-"}</td>
                    <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-200">{g.nama || "-"}</td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{g.nip || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Menampilkan {pageAwal + 1}-{Math.min(pageAwal + pageSize, data.length)} dari {data.length}
            </p>
            <nav className="flex items-center gap-1 text-sm">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-2 py-1 font-medium tracking-wide text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-40"
              >
                PREVIOUS
              </button>
              {getPageNumbers(page + 1, totalPages).map((p, i) =>
                p === "..." ? (
                  <span key={`ellipsis-${i}`} className="px-1.5 text-slate-400 dark:text-slate-500 select-none">
                    ...
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p - 1)}
                    className={`h-7 w-7 rounded-full text-sm font-medium transition-colors ${
                      p === page + 1
                        ? "bg-indigo-600 text-white"
                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-2 py-1 font-medium tracking-wide text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-40"
              >
                NEXT
              </button>
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}

const TABS = [
  { key: "siswa", label: "Siswa" },
  { key: "gtk", label: "GTK" },
] as const;

export default function LaporanVotingOsisPage() {
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]["key"]>("siswa");

  return (
    <div className="p-6 md:p-8">
      <a
        href="/laporan"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 mb-4"
      >
        <ChevronLeft className="h-4 w-4" />
        Kembali ke Laporan
      </a>

      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">Data Voting Osis</h1>

      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700 mb-6">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === t.key
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "siswa" ? <SiswaTab /> : <GtkTab />}
    </div>
  );
}
