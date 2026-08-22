"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Siswa, STATUS_SISWA_OPTIONS } from "@/types/siswa";
import { Plus, Search, Pencil, Trash2, Loader2, FileSpreadsheet, UserPlus, X } from "lucide-react";
import { useModulePermission } from "@/lib/role-context";
import { getPageNumbers } from "@/lib/pagination";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export default function SiswaListPage() {
  const { canEdit, canDelete } = useModulePermission("siswa");
  const isReadOnly = !canEdit;
  const [data, setData] = useState<Siswa[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Siswa | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Filter
  const [filterRombel, setFilterRombel] = useState("");
  const [filterJalur, setFilterJalur] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [rombelOptions, setRombelOptions] = useState<string[]>([]);
  const [jalurOptions, setJalurOptions] = useState<string[]>([]);

  // Ambil daftar rombel unik untuk isi dropdown filter (sekali saat halaman dibuka)
  useEffect(() => {
    async function fetchRombelOptions() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("siswa01")
        .select("rombel")
        .not("rombel", "is", null);

      if (!error && data) {
        const unique = Array.from(
          new Set(data.map((d) => d.rombel).filter(Boolean) as string[])
        ).sort();
        setRombelOptions(unique);
      }
    }
    fetchRombelOptions();
  }, []);

  // Ambil daftar jalur dari tabel referensi ref_jalur_daftar
  useEffect(() => {
    async function fetchJalurOptions() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("ref_jalur_daftar")
        .select("uraian")
        .order("kode", { ascending: true });

      if (!error && data) {
        setJalurOptions(data.map((d) => d.uraian));
      }
    }
    fetchJalurOptions();
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    let query = supabase
      .from("siswa01")
      .select(
        "id, nama, nisn, nipd, jk, tempat_lahir, tanggal_lahir, rombel, jalur, status_siswa",
        { count: "exact" }
      )
      .order("nama", { ascending: true })
      .range(page * pageSize, page * pageSize + pageSize - 1);

    if (search.trim()) {
      query = query.or(
        `nama.ilike.%${search}%,nisn.ilike.%${search}%,nipd.ilike.%${search}%`
      );
    }

    if (filterRombel) query = query.eq("rombel", filterRombel);
    if (filterJalur) query = query.eq("jalur", filterJalur);
    if (filterStatus) query = query.eq("status_siswa", filterStatus);

    const { data, count, error } = await query;

    if (!error) {
      setData(data ?? []);
      setTotal(count ?? 0);
    }
    setLoading(false);
  }, [page, pageSize, search, filterRombel, filterJalur, filterStatus]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleDelete() {
    if (!deleteTarget?.id) return;
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("siswa01")
      .delete()
      .eq("id", deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
    if (!error) {
      fetchData();
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasActiveFilter = filterRombel || filterJalur || filterStatus;

  function resetFilters() {
    setFilterRombel("");
    setFilterJalur("");
    setFilterStatus("");
    setPage(0);
  }

  return (
    <div className="p-6 md:p-8 dark:bg-slate-900">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Data Siswa</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {total} siswa terdaftar
          </p>
        </div>
        {!isReadOnly && (
          <div className="flex gap-3 self-start">
            <Link
              href="/siswa/import"
              className="inline-flex items-center gap-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Import Excel
            </Link>
            <Link
              href="/siswa/mutasi-masuk"
              className="inline-flex items-center gap-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <UserPlus className="h-4 w-4" />
              Mutasi Masuk
            </Link>
            <Link
              href="/siswa/tambah"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white text-sm font-medium px-4 py-2.5 hover:bg-indigo-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Tambah Siswa
            </Link>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <select
          value={pageSize}
          onChange={(e) => {
            setPageSize(Number(e.target.value));
            setPage(0);
          }}
          className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          {PAGE_SIZE_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n} / halaman
            </option>
          ))}
        </select>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Cari nama, NISN, atau NIPD..."
            className="w-full sm:w-72 rounded-lg border border-slate-300 dark:border-slate-600 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <select
          value={filterRombel}
          onChange={(e) => {
            setFilterRombel(e.target.value);
            setPage(0);
          }}
          className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="">Semua Rombel</option>
          {rombelOptions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        <select
          value={filterJalur}
          onChange={(e) => {
            setFilterJalur(e.target.value);
            setPage(0);
          }}
          className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="">Semua Jalur</option>
          {jalurOptions.map((j) => (
            <option key={j} value={j}>
              {j}
            </option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value);
            setPage(0);
          }}
          className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="">Semua Status</option>
          {STATUS_SISWA_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        {hasActiveFilter && (
          <button
            onClick={resetFilters}
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 px-2 py-2"
          >
            <X className="h-3.5 w-3.5" />
            Reset Filter
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40 text-left text-slate-500 dark:text-slate-400">
                <th className="px-4 py-3 font-medium w-12">No</th>
                <th className="px-4 py-3 font-medium">Nama</th>
                <th className="px-4 py-3 font-medium">JK</th>
                <th className="px-4 py-3 font-medium">NISN</th>
                <th className="px-4 py-3 font-medium">Tempat, Tgl Lahir</th>
                <th className="px-4 py-3 font-medium">Rombel</th>
                <th className="px-4 py-3 font-medium">Jalur</th>
                <th className="px-4 py-3 font-medium">Status</th>
                {(canEdit || canDelete) && (
                  <th className="px-4 py-3 font-medium text-right">Aksi</th>
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={canEdit || canDelete ? 9 : 8} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={canEdit || canDelete ? 9 : 8} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500">
                    Belum ada data siswa yang cocok.
                  </td>
                </tr>
              ) : (
                data.map((s, idx) => (
                  <tr key={s.id} className="border-b border-slate-100 dark:border-slate-700/60 last:border-0 hover:bg-slate-50/60 dark:hover:bg-slate-700/60">
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{page * pageSize + idx + 1}</td>
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{s.nama || "-"}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{s.jk || "-"}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{s.nisn || "-"}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {s.tempat_lahir || "-"}
                      {s.tanggal_lahir ? `, ${s.tanggal_lahir}` : ""}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{s.rombel || "-"}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{s.jalur || "-"}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-700 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                        {s.status_siswa || "-"}
                      </span>
                    </td>
                    {(canEdit || canDelete) && (
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {canEdit && (
                        <Link
                          href={`/siswa/${s.id}`}
                          className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                        )}
                        {canDelete && (
                        <button
                          onClick={() => setDeleteTarget(s)}
                          className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                          title="Hapus"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        )}
                      </div>
                    </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-end px-4 py-3 border-t border-slate-200 dark:border-slate-700">
          <nav className="flex items-center gap-1 text-sm">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-2 py-1 font-medium tracking-wide text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-40 disabled:hover:text-slate-500 dark:disabled:hover:text-slate-400"
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
              className="px-2 py-1 font-medium tracking-wide text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-40 disabled:hover:text-slate-500 dark:disabled:hover:text-slate-400"
            >
              NEXT
            </button>
          </nav>
        </div>
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1.5">
              Hapus data siswa?
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
              Data <span className="font-medium text-slate-700 dark:text-slate-200">{deleteTarget.nama}</span> akan
              dihapus permanen dan tidak dapat dikembalikan.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 inline-flex items-center gap-2"
              >
                {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
