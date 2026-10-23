"use client";

import { useCallback, useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/client";
import { useModulePermission, useRole } from "@/lib/role-context";
import { getPageNumbers } from "@/lib/pagination";
import { Download, Loader2, Search } from "lucide-react";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

type Row = {
  id: string;
  nisn: string;
  nama: string;
  jk: string | null;
  kelas: string | null;
  nominal_id: string | null;
  desil: string | null;
  terseleksi: boolean;
  kelas_seleksi: string | null;
  alasan: string | null;
};

const KOLOM = "id, nisn, nama, jk, kelas, nominal_id, desil, terseleksi, kelas_seleksi, alasan";

export default function PipSeleksiPage() {
  const { canEdit: canEditModule } = useModulePermission("data_pip");
  const { role } = useRole();
  const canEdit = role === "admin" || role === "kepala_sekolah" || canEditModule;

  const [data, setData] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [totalTerseleksi, setTotalTerseleksi] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const [search, setSearch] = useState("");
  const [filterKelas, setFilterKelas] = useState("");
  const [filterDesil, setFilterDesil] = useState("");
  const [filterSeleksi, setFilterSeleksi] = useState("ya");

  const terapkanFilter = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (query: any) => {
      if (search.trim()) {
        const q = search.trim().replace(/[,%]/g, " ");
        query = query.or(`nama.ilike.%${q}%,nisn.ilike.%${q}%`);
      }
      if (filterKelas) query = query.eq("kelas", filterKelas);
      if (filterDesil) query = query.eq("desil", filterDesil);
      if (filterSeleksi) query = query.eq("terseleksi", filterSeleksi === "ya");
      return query;
    },
    [search, filterKelas, filterDesil, filterSeleksi]
  );

  const fetchTotalTerseleksi = useCallback(async () => {
    const supabase = createClient();
    const { count } = await supabase
      .from("pip_siswa")
      .select("id", { count: "exact", head: true })
      .eq("terseleksi", true);
    setTotalTerseleksi(count ?? 0);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, count, error } = await terapkanFilter(
      supabase
        .from("pip_siswa")
        .select(KOLOM, { count: "exact" })
        .order("kelas", { ascending: true })
        .order("nama", { ascending: true })
        .range(page * pageSize, page * pageSize + pageSize - 1)
    );
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setData((data ?? []) as Row[]);
    setTotal(count ?? 0);
    setLoading(false);
  }, [page, pageSize, terapkanFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchTotalTerseleksi();
  }, [fetchTotalTerseleksi]);

  // Simpan perubahan satu baris; RLS yang menolak update tidak memberi error,
  // jadi cek jumlah baris yang benar-benar berubah.
  async function simpanBaris(row: Row, patch: Partial<Row>) {
    setSavingId(row.id);
    setError(null);
    const supabase = createClient();
    const { data: hasil, error } = await supabase
      .from("pip_siswa")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", row.id)
      .select("id");
    setSavingId(null);
    if (error) {
      setError(error.message);
      return false;
    }
    if (!hasil || hasil.length === 0) {
      setError("Perubahan tidak tersimpan -- akun ini belum punya izin ubah (modul Data PIP).");
      return false;
    }
    setData((prev) => prev.map((r) => (r.id === row.id ? { ...r, ...patch } : r)));
    fetchTotalTerseleksi();
    return true;
  }

  async function toggleSeleksi(row: Row) {
    const dipilih = !row.terseleksi;
    const patch: Partial<Row> = { terseleksi: dipilih };
    if (dipilih && !row.kelas_seleksi) {
      // Isi otomatis kelas (mis. 7.1) dari rombel siswa di data siswa, kalau ada
      const supabase = createClient();
      const { data: s } = await supabase.from("siswa01").select("rombel").eq("nisn", row.nisn).maybeSingle();
      if (s?.rombel) patch.kelas_seleksi = s.rombel;
    }
    await simpanBaris(row, patch);
  }

  async function handleExport() {
    setExporting(true);
    const supabase = createClient();
    const semua: Row[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase
        .from("pip_siswa")
        .select(KOLOM)
        .eq("terseleksi", true)
        .order("kelas_seleksi", { ascending: true })
        .order("nama", { ascending: true })
        .range(from, from + 999);
      if (error) {
        setExporting(false);
        window.alert("Gagal mengambil data: " + error.message);
        return;
      }
      semua.push(...((data ?? []) as Row[]));
      if (!data || data.length < 1000) break;
    }
    const ws = XLSX.utils.aoa_to_sheet([
      ["NO", "NISN", "Nama Murid", "JK", "Kelas", "Nominal ID", "Desil", "Alasan"],
      ...semua.map((r, i) => [
        i + 1, r.nisn, r.nama, r.jk ?? "", r.kelas_seleksi ?? r.kelas ?? "", r.nominal_id ?? "", r.desil ?? "", r.alasan ?? "",
      ]),
    ]);
    for (let r = 1; r <= semua.length; r++) {
      const cell = ws["B" + (r + 1)];
      if (cell) {
        cell.t = "s";
        cell.z = "@";
      }
    }
    ws["!cols"] = [{ wch: 5 }, { wch: 14 }, { wch: 35 }, { wch: 5 }, { wch: 8 }, { wch: 10 }, { wch: 8 }, { wch: 30 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "seleksi");
    XLSX.writeFile(wb, "PIP-Seleksi.xlsx");
    setExporting(false);
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const filterClass =
    "rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500";
  const miniInput =
    "rounded border border-slate-300 dark:border-slate-600 px-2 py-1 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400";
  const resetPage = () => setPage(0);

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">PIP Seleksi</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Centang siswa yang dipilih dari seluruh Data PIP — terseleksi <strong>{totalTerseleksi}</strong> siswa
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting || totalTerseleksi === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
        >
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Export Terseleksi
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <select
          value={pageSize}
          onChange={(e) => {
            setPageSize(Number(e.target.value));
            resetPage();
          }}
          className={filterClass}
        >
          {PAGE_SIZE_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n} / halaman
            </option>
          ))}
        </select>
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              resetPage();
            }}
            placeholder="Cari nama / NISN..."
            className={`${filterClass} pl-9 w-56`}
          />
        </div>
        <select value={filterKelas} onChange={(e) => { setFilterKelas(e.target.value); resetPage(); }} className={filterClass}>
          <option value="">Semua Kelas</option>
          {["7", "8", "9"].map((k) => (
            <option key={k} value={k}>
              Kelas {k}
            </option>
          ))}
        </select>
        <select value={filterDesil} onChange={(e) => { setFilterDesil(e.target.value); resetPage(); }} className={filterClass}>
          <option value="">Semua Desil</option>
          {["1", "2", "3", "4"].map((d) => (
            <option key={d} value={d}>
              Desil {d}
            </option>
          ))}
        </select>
        <select value={filterSeleksi} onChange={(e) => { setFilterSeleksi(e.target.value); resetPage(); }} className={filterClass}>
          <option value="">Semua</option>
          <option value="ya">Terseleksi</option>
          <option value="tidak">Belum terseleksi</option>
        </select>
      </div>

      {!canEdit && (
        <p className="text-sm text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-2 mb-4">
          Anda hanya bisa melihat. Mengubah seleksi butuh hak edit modul Data PIP.
        </p>
      )}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg px-3 py-2 mb-4">
          {error}
        </p>
      )}

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40 text-left text-slate-500 dark:text-slate-400">
                <th className="px-3 py-3 font-medium w-14 text-center">Pilih</th>
                <th className="px-3 py-3 font-medium">NISN</th>
                <th className="px-3 py-3 font-medium">Nama Murid</th>
                <th className="px-3 py-3 font-medium">JK</th>
                <th className="px-3 py-3 font-medium">Kelas</th>
                <th className="px-3 py-3 font-medium text-center">Nominal</th>
                <th className="px-3 py-3 font-medium text-center">Desil</th>
                <th className="px-3 py-3 font-medium">Kelas Seleksi</th>
                <th className="px-3 py-3 font-medium">Alasan</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500">
                    Tidak ada data PIP. Impor dulu lewat menu Data PIP.
                  </td>
                </tr>
              ) : (
                data.map((r) => (
                  <tr
                    key={r.id}
                    className={`border-b border-slate-100 dark:border-slate-700/60 last:border-0 ${
                      r.terseleksi ? "bg-emerald-50/60 dark:bg-emerald-500/10" : "hover:bg-slate-50/60 dark:hover:bg-slate-700"
                    }`}
                  >
                    <td className="px-3 py-2 text-center">
                      {savingId === r.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mx-auto text-slate-400" />
                      ) : (
                        <input
                          type="checkbox"
                          checked={r.terseleksi}
                          disabled={!canEdit}
                          onChange={() => toggleSeleksi(r)}
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      )}
                    </td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{r.nisn}</td>
                    <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-200">{r.nama}</td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{r.jk ?? "-"}</td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{r.kelas ?? "-"}</td>
                    <td className="px-3 py-2 text-center text-slate-600 dark:text-slate-300">{r.nominal_id ?? "-"}</td>
                    <td className="px-3 py-2 text-center text-slate-600 dark:text-slate-300">{r.desil ?? "-"}</td>
                    <td className="px-3 py-2">
                      <input
                        key={`ks-${r.id}-${r.kelas_seleksi ?? ""}`}
                        defaultValue={r.kelas_seleksi ?? ""}
                        disabled={!canEdit || !r.terseleksi}
                        placeholder="mis. 7.1"
                        onBlur={(e) => {
                          const v = e.target.value.trim() || null;
                          if (v !== (r.kelas_seleksi ?? null)) simpanBaris(r, { kelas_seleksi: v });
                        }}
                        className={`${miniInput} w-20`}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        key={`al-${r.id}-${r.alasan ?? ""}`}
                        defaultValue={r.alasan ?? ""}
                        disabled={!canEdit || !r.terseleksi}
                        placeholder="Alasan (opsional)"
                        onBlur={(e) => {
                          const v = e.target.value.trim() || null;
                          if (v !== (r.alasan ?? null)) simpanBaris(r, { alasan: v });
                        }}
                        className={`${miniInput} w-56`}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {total === 0 ? "0 data" : `Menampilkan ${page * pageSize + 1}-${Math.min((page + 1) * pageSize, total)} dari ${total}`}
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
    </div>
  );
}
