"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getPageNumbers } from "@/lib/pagination";
import { Activity, Loader2, Search, X } from "lucide-react";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

type Ringkasan = {
  user_id: string;
  email: string | null;
  nama: string | null;
  role: string | null;
  jumlah_login: number;
  jumlah_akses: number;
  terakhir_login: string | null;
  terakhir_akses: string | null;
  menu_terakhir: string | null;
  last_sign_in_auth: string | null;
};

type LogRow = { id: number; jenis: string; path: string | null; menu: string | null; created_at: string };

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  kepala_sekolah: "Kepala Sekolah",
  guru: "Guru",
  staf_tu: "Staf Tata Usaha",
};

function waktu(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AksesPenggunaPage() {
  const [data, setData] = useState<Ringkasan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterLogin, setFilterLogin] = useState<"" | "sudah" | "belum">("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);

  const [detail, setDetail] = useState<Ringkasan | null>(null);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("akses_pengguna_ringkasan");
    if (error) {
      setError(
        error.message.includes("akses_pengguna_ringkasan") || error.code === "42883" || error.code === "42P01"
          ? "Fungsi/tabel belum ada -- jalankan supabase/akses-log-schema.sql di Supabase SQL Editor."
          : error.message
      );
      setLoading(false);
      return;
    }
    const rows = ((data ?? []) as Ringkasan[]).map((r) => ({
      ...r,
      jumlah_login: Number(r.jumlah_login),
      jumlah_akses: Number(r.jumlah_akses),
    }));
    // Yang terakhir mengakses paling atas; yang belum pernah tercatat di bawah
    rows.sort((a, b) => (b.terakhir_akses ?? "").localeCompare(a.terakhir_akses ?? ""));
    setData(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function bukaDetail(r: Ringkasan) {
    setDetail(r);
    setLogs([]);
    setLogsLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("akses_log")
      .select("id, jenis, path, menu, created_at")
      .eq("user_id", r.user_id)
      .order("created_at", { ascending: false })
      .limit(50);
    setLogs((data ?? []) as LogRow[]);
    setLogsLoading(false);
  }

  const q = search.trim().toLowerCase();
  // "Pernah login" = ada catatan login di aplikasi ATAU tercatat login di sistem auth (login sebelum pencatatan dimulai)
  const pernahLogin = (r: Ringkasan) => r.jumlah_login > 0 || Boolean(r.last_sign_in_auth);
  const filtered = data.filter((r) => {
    if (q && !(r.nama ?? "").toLowerCase().includes(q) && !(r.email ?? "").toLowerCase().includes(q)) return false;
    if (filterLogin === "sudah") return pernahLogin(r);
    if (filterLogin === "belum") return !pernahLogin(r);
    return true;
  });
  const jumlahBelumLogin = data.filter((r) => !pernahLogin(r)).length;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const tampil = filtered.slice(page * pageSize, page * pageSize + pageSize);
  const totalLogin = data.reduce((a, r) => a + r.jumlah_login, 0);
  const totalAkses = data.reduce((a, r) => a + r.jumlah_akses, 0);
  const pernahAkses = data.filter((r) => r.terakhir_akses).length;

  const filterClass =
    "rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500";

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Akses Pengguna</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Berapa kali tiap pengguna login & membuka halaman, serta kapan dan menu apa yang terakhir diakses
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total login tercatat", nilai: totalLogin },
          { label: "Total halaman dibuka", nilai: totalAkses },
          { label: "Pengguna pernah akses", nilai: `${pernahAkses} / ${data.length}` },
        ].map((k) => (
          <div key={k.label} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">{k.label}</p>
            <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mt-1">{k.nilai}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
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
          value={filterLogin}
          onChange={(e) => {
            setFilterLogin(e.target.value as "" | "sudah" | "belum");
            setPage(0);
          }}
          className={filterClass}
        >
          <option value="">Semua (login)</option>
          <option value="sudah">Sudah pernah login ({data.length - jumlahBelumLogin})</option>
          <option value="belum">Belum pernah login ({jumlahBelumLogin})</option>
        </select>
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Cari nama / email..."
            className={`${filterClass} pl-9 w-60`}
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg px-3 py-2 mb-4">
          {error}
        </p>
      )}

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40 text-left text-slate-500 dark:text-slate-400">
                <th className="px-4 py-3 font-medium">Pengguna</th>
                <th className="px-4 py-3 font-medium">Peran</th>
                <th className="px-4 py-3 font-medium text-center">Login</th>
                <th className="px-4 py-3 font-medium text-center">Halaman Dibuka</th>
                <th className="px-4 py-3 font-medium">Terakhir Akses</th>
                <th className="px-4 py-3 font-medium">Menu Terakhir</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : tampil.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500">
                    <Activity className="h-6 w-6 mx-auto mb-2 text-slate-300" />
                    Belum ada data.
                  </td>
                </tr>
              ) : (
                tampil.map((r) => (
                  <tr
                    key={r.user_id}
                    onClick={() => bukaDetail(r)}
                    className="border-b border-slate-100 dark:border-slate-700/60 last:border-0 cursor-pointer hover:bg-slate-50/60 dark:hover:bg-slate-700"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800 dark:text-slate-200">{r.nama ?? r.email ?? "-"}</p>
                      {r.nama && <p className="text-xs text-slate-500 dark:text-slate-400">{r.email}</p>}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{ROLE_LABEL[r.role ?? ""] ?? r.role ?? "-"}</td>
                    <td className="px-4 py-3 text-center text-slate-700 dark:text-slate-200">{r.jumlah_login}</td>
                    <td className="px-4 py-3 text-center text-slate-700 dark:text-slate-200">{r.jumlah_akses}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {r.terakhir_akses ? waktu(r.terakhir_akses) : r.last_sign_in_auth ? `${waktu(r.last_sign_in_auth)} (login)` : "Belum pernah"}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{r.menu_terakhir ?? "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {filtered.length === 0
              ? "0 pengguna"
              : `Menampilkan ${page * pageSize + 1}-${Math.min((page + 1) * pageSize, filtered.length)} dari ${filtered.length}`}
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

      {detail && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-lg w-full shadow-xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">{detail.nama ?? detail.email}</h3>
              <button onClick={() => setDetail(null)}>
                <X className="h-4 w-4 text-slate-400 dark:text-slate-500" />
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Login terakhir: {waktu(detail.terakhir_login ?? detail.last_sign_in_auth)} · 50 aktivitas terakhir
            </p>
            <div className="overflow-y-auto">
              {logsLoading ? (
                <Loader2 className="h-5 w-5 animate-spin mx-auto my-6 text-slate-400" />
              ) : logs.length === 0 ? (
                <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-6">Belum ada aktivitas tercatat.</p>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-700/60 text-sm">
                  {logs.map((l) => (
                    <li key={l.id} className="py-2 flex items-center justify-between gap-3">
                      <span className="text-slate-800 dark:text-slate-200">
                        {l.jenis === "login" ? (
                          <span className="rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 text-xs font-medium">
                            Login
                          </span>
                        ) : (
                          l.menu ?? l.path
                        )}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">{waktu(l.created_at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
