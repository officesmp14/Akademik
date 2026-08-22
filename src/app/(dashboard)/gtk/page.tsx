"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Gtk, JENIS_PTK_OPTIONS, STATUS_KEPEGAWAIAN_OPTIONS, STATUS_AKTIF_OPTIONS } from "@/types/gtk";
import { Plus, Search, Pencil, Trash2, Loader2, FileSpreadsheet, X, KeyRound, Copy, Check } from "lucide-react";
import { useModulePermission, useRole } from "@/lib/role-context";
import { getPageNumbers } from "@/lib/pagination";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export default function GtkListPage() {
  const { canEdit, canDelete } = useModulePermission("gtk");
  const { role } = useRole();
  const isAdmin = role === "admin";
  const isReadOnly = !canEdit;
  const [data, setData] = useState<Gtk[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Gtk | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [resetTarget, setResetTarget] = useState<Gtk | null>(null);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetResult, setResetResult] = useState<{ email: string | null; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const [filterJenisPtk, setFilterJenisPtk] = useState("");
  const [filterStatusKepegawaian, setFilterStatusKepegawaian] = useState("");
  const [filterStatusAktif, setFilterStatusAktif] = useState("Y");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    let query = supabase
      .from("datagtk")
      .select(
        "id, nama, nip, nuptk, jk, jenis_ptk, status_kepegawaian, status_aktif, hp",
        { count: "exact" }
      )
      .order("nama", { ascending: true })
      .range(page * pageSize, page * pageSize + pageSize - 1);

    if (search.trim()) {
      query = query.or(
        `nama.ilike.%${search}%,nip.ilike.%${search}%,nuptk.ilike.%${search}%`
      );
    }

    if (filterJenisPtk) query = query.eq("jenis_ptk", filterJenisPtk);
    if (filterStatusKepegawaian)
      query = query.eq("status_kepegawaian", filterStatusKepegawaian);
    if (filterStatusAktif) query = query.eq("status_aktif", filterStatusAktif);

    const { data, count, error } = await query;

    if (!error) {
      setData(data ?? []);
      setTotal(count ?? 0);
    }
    setLoading(false);
  }, [page, pageSize, search, filterJenisPtk, filterStatusKepegawaian, filterStatusAktif]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleDelete() {
    if (!deleteTarget?.id) return;
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("datagtk")
      .delete()
      .eq("id", deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
    if (!error) {
      fetchData();
    }
  }

  async function handleResetPassword() {
    if (!resetTarget?.id) return;
    setResetting(true);
    setResetError(null);
    try {
      const res = await fetch(`/api/admin/gtk/${resetTarget.id}/reset-password`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        setResetError(json.error ?? "Gagal mereset password");
        setResetting(false);
        return;
      }
      setResetResult({ email: json.email, password: json.password });
    } catch {
      setResetError("Terjadi kesalahan tak terduga");
    }
    setResetting(false);
  }

  function closeResetModal() {
    setResetTarget(null);
    setResetError(null);
    setResetResult(null);
    setResetting(false);
    setCopied(false);
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasActiveFilter = filterJenisPtk || filterStatusKepegawaian || filterStatusAktif !== "Y";

  function resetFilters() {
    setFilterJenisPtk("");
    setFilterStatusKepegawaian("");
    setFilterStatusAktif("Y");
    setPage(0);
  }

  return (
    <div className="p-6 md:p-8 dark:bg-slate-900">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Data GTK</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {total} guru & tenaga kependidikan terdaftar
          </p>
        </div>
        {!isReadOnly && (
        <div className="flex gap-3 self-start">
          <Link
            href="/gtk/import"
            className="inline-flex items-center gap-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Import dari Sekolah
          </Link>
          <Link
            href="/gtk/import-dinas"
            className="inline-flex items-center gap-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Import dari Dinas
          </Link>
          <Link
            href="/gtk/tambah"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white text-sm font-medium px-4 py-2.5 hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Tambah GTK
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
            placeholder="Cari nama, NIP, atau NUPTK..."
            className="w-full sm:w-72 rounded-lg border border-slate-300 dark:border-slate-600 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <select
          value={filterJenisPtk}
          onChange={(e) => {
            setFilterJenisPtk(e.target.value);
            setPage(0);
          }}
          className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="">Semua Jenis PTK</option>
          {JENIS_PTK_OPTIONS.map((j) => (
            <option key={j} value={j}>
              {j}
            </option>
          ))}
        </select>

        <select
          value={filterStatusKepegawaian}
          onChange={(e) => {
            setFilterStatusKepegawaian(e.target.value);
            setPage(0);
          }}
          className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="">Semua Status Kepegawaian</option>
          {STATUS_KEPEGAWAIAN_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          value={filterStatusAktif}
          onChange={(e) => {
            setFilterStatusAktif(e.target.value);
            setPage(0);
          }}
          className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          {STATUS_AKTIF_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
          <option value="">Semua</option>
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
                <th className="px-4 py-3 font-medium">NIP / NUPTK</th>
                <th className="px-4 py-3 font-medium">Jenis PTK</th>
                <th className="px-4 py-3 font-medium">Status Kepegawaian</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">HP</th>
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
                    Belum ada data GTK yang cocok.
                  </td>
                </tr>
              ) : (
                data.map((g, idx) => (
                  <tr key={g.id} className="border-b border-slate-100 dark:border-slate-700/60 last:border-0 hover:bg-slate-50/60 dark:hover:bg-slate-700/60">
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{page * pageSize + idx + 1}</td>
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{g.nama || "-"}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{g.jk || "-"}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{g.nip || g.nuptk || "-"}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{g.jenis_ptk || "-"}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-700 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                        {g.status_kepegawaian || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {g.status_aktif === "Y" ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          Aktif
                        </span>
                      ) : g.status_aktif === "N" ? (
                        <span className="inline-flex items-center rounded-full bg-red-50 dark:bg-red-500/10 px-2.5 py-0.5 text-xs font-medium text-red-600 dark:text-red-400">
                          Tidak Aktif
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{g.hp || "-"}</td>
                    {(canEdit || canDelete) && (
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {canEdit && (
                        <Link
                          href={`/gtk/${g.id}`}
                          className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                        )}
                        {isAdmin && (
                        <button
                          onClick={() => setResetTarget(g)}
                          className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                          title="Reset Password"
                        >
                          <KeyRound className="h-4 w-4" />
                        </button>
                        )}
                        {canDelete && (
                        <button
                          onClick={() => setDeleteTarget(g)}
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

      {resetTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-sm w-full shadow-xl">
            {resetResult ? (
              <>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1.5">Password Berhasil Direset</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                  Password baru untuk{" "}
                  <span className="font-medium text-slate-700 dark:text-slate-200">{resetTarget.nama}</span>
                  {resetResult.email ? ` (${resetResult.email})` : ""}. Salin dan sampaikan ke
                  yang bersangkutan, password ini tidak akan ditampilkan lagi.
                </p>
                <div className="flex items-center gap-2 mb-5">
                  <code className="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/40 px-3 py-2 text-sm font-mono text-slate-800 dark:text-slate-200 select-all">
                    {resetResult.password}
                  </code>
                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText(resetResult.password);
                      setCopied(true);
                    }}
                    title="Salin"
                    className="p-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={closeResetModal}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700"
                  >
                    Selesai
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1.5">Reset password GTK ini?</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
                  Password akun login untuk{" "}
                  <span className="font-medium text-slate-700 dark:text-slate-200">{resetTarget.nama}</span> akan
                  diganti dengan password baru secara acak. Password lama tidak akan berlaku lagi.
                </p>
                {resetError && (
                  <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg px-3 py-2 mb-4">
                    {resetError}
                  </p>
                )}
                <div className="flex justify-end gap-2">
                  <button
                    onClick={closeResetModal}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleResetPassword}
                    disabled={resetting}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-60 inline-flex items-center gap-2"
                  >
                    {resetting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Reset Password
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1.5">
              Hapus data GTK?
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
