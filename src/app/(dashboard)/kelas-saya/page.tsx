"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRole } from "@/lib/role-context";
import { getPageNumbers } from "@/lib/pagination";
import { Siswa } from "@/types/siswa";
import { Pencil, Loader2, Search } from "lucide-react";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export default function KelasSayaPage() {
  const { waliKelasRombel } = useRole();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Siswa[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);

  useEffect(() => {
    async function fetchData() {
      if (!waliKelasRombel) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from("siswa01")
        .select(
          "id, nama, nisn, nipd, jk, tempat_lahir, tanggal_lahir, alamat, hp, nama_ayah, nama_ibu, status_siswa"
        )
        .eq("rombel", waliKelasRombel)
        .order("nama", { ascending: true });

      if (!error) setData(data ?? []);
      setLoading(false);
    }
    fetchData();
  }, [waliKelasRombel]);

  const filtered = data.filter((s) =>
    (s.nama ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice(page * pageSize, page * pageSize + pageSize);

  if (!waliKelasRombel) {
    return (
      <div className="p-6 md:p-8 max-w-3xl mx-auto">
        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-6">
          <h1 className="text-lg font-semibold text-amber-800 dark:text-amber-400 mb-2">
            Belum Ditugaskan sebagai Wali Kelas
          </h1>
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Akun Anda belum ditugaskan sebagai wali kelas rombel manapun. Silakan hubungi admin
            sekolah untuk mengaturnya lewat halaman Wali Kelas.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Data Siswa Kelas Saya</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Wali Kelas <strong>{waliKelasRombel}</strong> &middot; {data.length} siswa
        </p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <select
          value={pageSize}
          onChange={(e) => {
            setPageSize(Number(e.target.value));
            setPage(0);
          }}
          className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
            placeholder="Cari nama siswa..."
            className="w-full sm:w-80 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
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
                <th className="px-4 py-3 font-medium">Alamat</th>
                <th className="px-4 py-3 font-medium">Ortu (Ayah/Ibu)</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500">
                    Belum ada data siswa di kelas ini.
                  </td>
                </tr>
              ) : (
                paginated.map((s, idx) => (
                  <tr key={s.id} className="border-b border-slate-100 dark:border-slate-700/60 last:border-0 hover:bg-slate-50/60 dark:hover:bg-slate-700/40">
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{page * pageSize + idx + 1}</td>
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{s.nama || "-"}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{s.jk || "-"}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{s.nisn || "-"}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 max-w-[200px] truncate">{s.alamat || "-"}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {s.nama_ayah || "-"} / {s.nama_ibu || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-700 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                        {s.status_siswa || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end">
                        <Link
                          href={`/siswa/${s.id}`}
                          className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </div>
                    </td>
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
                    p === page + 1 ? "bg-indigo-600 text-white" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
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
    </div>
  );
}
