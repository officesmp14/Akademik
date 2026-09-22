"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRole } from "@/lib/role-context";
import { ChevronLeft, Loader2, RotateCcw, Search, UserCheck } from "lucide-react";

type RowGtk = {
  id: string;
  nama: string | null;
  nip: string | null;
  jenis_ptk: string | null;
  status_aktif: string | null;
  created_at: string | null;
  updated_at: string | null;
  updated_by_nama: string | null;
};

type StatusUpdate = "sendiri" | "lain" | "belum";

function normalisasiNama(nama: string | null): string {
  return (nama ?? "").trim().toLowerCase();
}

function hitungStatus(row: RowGtk): StatusUpdate {
  if (!row.updated_by_nama) return "belum";
  return normalisasiNama(row.updated_by_nama) === normalisasiNama(row.nama) ? "sendiri" : "lain";
}

const STATUS_LABEL: Record<StatusUpdate, string> = {
  sendiri: "Sudah update sendiri",
  lain: "Diupdate orang lain",
  belum: "Belum pernah diupdate",
};

const STATUS_BADGE_CLASS: Record<StatusUpdate, string> = {
  sendiri: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  lain: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  belum: "bg-slate-100 text-slate-500 dark:bg-slate-700/60 dark:text-slate-400",
};

type FilterStatus = "semua" | "sudah" | "belum";

const FILTER_OPTIONS: { key: FilterStatus; label: string }[] = [
  { key: "semua", label: "Semua" },
  { key: "sudah", label: "Sudah Update" },
  { key: "belum", label: "Belum Update" },
];

export default function LaporanStatusUpdateGtkPage() {
  const { role } = useRole();
  const isFullAccessRole = role === "admin" || role === "kepala_sekolah";

  const [data, setData] = useState<RowGtk[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("semua");
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const { data, error } = await supabase
      .from("datagtk")
      .select("id, nama, nip, jenis_ptk, status_aktif, created_at, updated_at, updated_by_nama")
      .order("nama", { ascending: true });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setData(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleResetSemua() {
    if (
      !window.confirm(
        "Reset status update untuk SEMUA GTK? Kolom \"Diupdate Oleh\" dan \"Terakhir Diupdate\" akan dikosongkan dan status kembali ke \"Belum Update\" -- tindakan ini tidak bisa dibatalkan."
      )
    ) {
      return;
    }

    setResetting(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("datagtk")
      .update({ updated_by: null, updated_by_nama: null })
      .not("id", "is", null);

    setResetting(false);
    if (error) {
      setError(error.message);
      return;
    }
    fetchData();
  }

  const filtered = data.filter((row) => {
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const cocok = (row.nama ?? "").toLowerCase().includes(q) || (row.nip ?? "").toLowerCase().includes(q);
      if (!cocok) return false;
    }
    if (filterStatus === "semua") return true;
    const status = hitungStatus(row);
    return filterStatus === "sudah" ? status !== "belum" : status === "belum";
  });

  const jumlahSendiri = data.filter((row) => hitungStatus(row) === "sendiri").length;

  return (
    <div className="p-6 md:p-8">
      <a
        href="/laporan"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 mb-4"
      >
        <ChevronLeft className="h-4 w-4" />
        Kembali ke Laporan
      </a>

      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-indigo-500" />
            Status Update Data GTK
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {jumlahSendiri} dari {data.length} GTK sudah memperbarui datanya sendiri
          </p>
        </div>
        {isFullAccessRole && (
          <button
            onClick={handleResetSemua}
            disabled={resetting || loading}
            className="inline-flex items-center gap-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
          >
            {resetting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
            Reset Update Data
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama atau NIP..."
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
          className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {FILTER_OPTIONS.map((opt) => (
            <option key={opt.key} value={opt.key}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg px-3 py-2 mb-4">
          {error}
        </p>
      )}

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40 text-left text-slate-500 dark:text-slate-400">
                <th className="px-4 py-3 font-medium w-12">No</th>
                <th className="px-4 py-3 font-medium">Nama</th>
                <th className="px-4 py-3 font-medium">NIP</th>
                <th className="px-4 py-3 font-medium">Jenis PTK</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Diupdate Oleh</th>
                <th className="px-4 py-3 font-medium">Terakhir Diupdate</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500">
                    Tidak ada data GTK yang cocok.
                  </td>
                </tr>
              ) : (
                filtered.map((row, idx) => {
                  const status = hitungStatus(row);
                  return (
                    <tr
                      key={row.id}
                      className="border-b border-slate-100 dark:border-slate-700/60 last:border-0 hover:bg-slate-50/60 dark:hover:bg-slate-700/60"
                    >
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{idx + 1}</td>
                      <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                        {row.nama || "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{row.nip || "-"}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{row.jenis_ptk || "-"}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_BADGE_CLASS[status]}`}
                        >
                          {STATUS_LABEL[status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {row.updated_by_nama || "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">
                        {status === "belum" || !row.updated_at
                          ? "-"
                          : new Date(row.updated_at).toLocaleString("id-ID")}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
