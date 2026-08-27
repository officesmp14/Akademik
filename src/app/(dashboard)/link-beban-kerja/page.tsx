"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRole } from "@/lib/role-context";
import { JENIS_PTK_OPTIONS } from "@/types/gtk";
import { Loader2, X, ExternalLink, Link2 } from "lucide-react";

type GtkBebanKerjaRow = {
  id: string;
  nama: string | null;
  nip: string | null;
  jenis_ptk: string | null;
  link_beban_kerja: string | null;
};

export default function LinkBebanKerjaPage() {
  const { role, gtkId } = useRole();
  const isAdmin = role === "admin";

  const [rows, setRows] = useState<GtkBebanKerjaRow[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [filterJenisPtk, setFilterJenisPtk] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    // Bukan admin -- cuma boleh lihat baris miliknya sendiri. Difilter di
    // query (bukan cuma di UI) supaya baris GTK lain tidak ikut terkirim
    // ke browser sama sekali.
    if (!isAdmin && !gtkId) {
      setRows([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const supabase = createClient();
    let query = supabase
      .from("gtk_beban_kerja_publik")
      .select("id, nama, nip, jenis_ptk, link_beban_kerja")
      .order("nama", { ascending: true });
    if (!isAdmin) {
      query = query.eq("id", gtkId!);
    }
    const { data, error } = await query;

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    const list = (data ?? []) as GtkBebanKerjaRow[];
    setRows(list);
    setValues(Object.fromEntries(list.map((r) => [r.id, r.link_beban_kerja ?? ""])));
    setLoading(false);
  }, [isAdmin, gtkId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const filteredRows = useMemo(
    () => (filterJenisPtk ? rows.filter((r) => r.jenis_ptk === filterJenisPtk) : rows),
    [rows, filterJenisPtk]
  );

  async function saveRow(id: string, value: string) {
    setSavingId(id);
    setError(null);
    const supabase = createClient();

    const { error } = await supabase
      .from("datagtk")
      .update({ link_beban_kerja: value.trim() || null })
      .eq("id", id);

    setSavingId(null);

    if (error) {
      setError(error.message);
      return;
    }

    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, link_beban_kerja: value.trim() || null } : r)));
  }

  function handleBlur(row: GtkBebanKerjaRow) {
    const value = values[row.id] ?? "";
    if (value.trim() === (row.link_beban_kerja ?? "")) return;
    saveRow(row.id, value);
  }

  function handleClear(row: GtkBebanKerjaRow) {
    setValues((prev) => ({ ...prev, [row.id]: "" }));
    saveRow(row.id, "");
  }

  if (!isAdmin && !gtkId) {
    return (
      <div className="p-6 md:p-8 max-w-3xl mx-auto">
        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-6">
          <h1 className="text-lg font-semibold text-amber-800 dark:text-amber-400 mb-2">Profil Belum Terhubung</h1>
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Akun Anda belum terhubung ke data GTK. Hubungi admin untuk menghubungkannya.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-1">Link Beban Kerja</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
        {isAdmin
          ? "Link dokumen beban kerja (mis. Google Drive) tiap guru, kepala sekolah, dan staf TU."
          : "Link dokumen beban kerja Anda. Hanya admin yang bisa menambah/mengubahnya."}
      </p>

      {isAdmin && (
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <select
            value={filterJenisPtk}
            onChange={(e) => setFilterJenisPtk(e.target.value)}
            className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Semua Jenis PTK</option>
            {JENIS_PTK_OPTIONS.map((j) => (
              <option key={j} value={j}>
                {j}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg px-3 py-2 mb-4">
          {error}
        </p>
      )}

      {loading ? (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-10 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400 dark:text-slate-500" />
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40 text-left text-slate-500 dark:text-slate-400">
                <th className="px-4 py-3 font-medium w-12">No</th>
                <th className="px-4 py-3 font-medium">Nama</th>
                <th className="px-4 py-3 font-medium">NIP</th>
                <th className="px-4 py-3 font-medium">Link Beban Kerja</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500">
                    <Link2 className="h-6 w-6 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    Belum ada data GTK yang cocok.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => {
                  const canManage = isAdmin;
                  return (
                    <tr key={row.id} className="border-b border-slate-100 dark:border-slate-700/60 last:border-0">
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{idx + 1}</td>
                      <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{row.nama || "-"}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{row.nip || "-"}</td>
                      <td className="px-4 py-3">
                        {canManage ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="url"
                              value={values[row.id] ?? ""}
                              onChange={(e) => setValues((prev) => ({ ...prev, [row.id]: e.target.value }))}
                              onBlur={() => handleBlur(row)}
                              placeholder="https://drive.google.com/..."
                              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            {savingId === row.id ? (
                              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-indigo-400" />
                            ) : row.link_beban_kerja ? (
                              <button
                                onClick={() => handleClear(row)}
                                title="Hapus link"
                                className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 shrink-0"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            ) : (
                              <div className="h-4 w-4 shrink-0" />
                            )}
                          </div>
                        ) : row.link_beban_kerja ? (
                          <a
                            href={row.link_beban_kerja}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={row.link_beban_kerja}
                            className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Lihat
                          </a>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
