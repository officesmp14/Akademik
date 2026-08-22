"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ReferensiConfig } from "@/lib/referensi-catalog";
import { ChevronLeft, Pencil, Trash2, Loader2, X, Plus, Tags } from "lucide-react";

type Row = { kode: number; uraian: string };

const emptyForm = { kode: "", uraian: "" };

export default function ReferensiCrud({ config }: { config: ReferensiConfig }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingKode, setEditingKode] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase
      .from(config.table)
      .select("kode, uraian")
      .order("kode", { ascending: true });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setRows(data ?? []);
    setLoading(false);
  }, [config.table]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  function openAdd() {
    setEditingKode(null);
    setForm(emptyForm);
    setActionError(null);
    setShowForm(true);
  }

  function openEdit(row: Row) {
    setEditingKode(row.kode);
    setForm({ kode: String(row.kode), uraian: row.uraian });
    setActionError(null);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.uraian.trim()) return;

    const supabase = createClient();
    setSaving(true);
    setActionError(null);

    if (editingKode !== null) {
      const { error } = await supabase
        .from(config.table)
        .update({ uraian: form.uraian.trim() })
        .eq("kode", editingKode);

      setSaving(false);
      if (error) {
        setActionError(error.message);
        return;
      }
    } else {
      const kodeNum = Number(form.kode);
      if (!form.kode.trim() || !Number.isInteger(kodeNum)) {
        setSaving(false);
        setActionError("Kode harus berupa angka bulat.");
        return;
      }

      const { error } = await supabase
        .from(config.table)
        .insert({ kode: kodeNum, uraian: form.uraian.trim() });

      setSaving(false);
      if (error) {
        setActionError(
          error.code === "23505" ? "Kode ini sudah dipakai, gunakan kode lain." : error.message
        );
        return;
      }
    }

    setShowForm(false);
    fetchAll();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from(config.table).delete().eq("kode", deleteTarget.kode);
    setSaving(false);
    if (!error) {
      setDeleteTarget(null);
      fetchAll();
    } else {
      setActionError(error.message);
    }
  }

  return (
    <div className="p-6 md:p-8">
      <a
        href="/referensi"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 mb-4"
      >
        <ChevronLeft className="h-4 w-4" />
        Kembali ke Referensi
      </a>

      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Referensi {config.label}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{config.description}</p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white text-sm font-medium px-4 py-2 hover:bg-indigo-700 shrink-0"
        >
          <Plus className="h-4 w-4" />
          Tambah Data
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg px-3 py-2 mb-4">
          {error}
        </p>
      )}

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40 text-left text-slate-500 dark:text-slate-400">
              <th className="px-4 py-3 font-medium w-12">No</th>
              <th className="px-4 py-3 font-medium w-28">Kode</th>
              <th className="px-4 py-3 font-medium">Uraian</th>
              <th className="px-4 py-3 font-medium text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500">
                  <Tags className="h-6 w-6 mx-auto mb-2 text-slate-300" />
                  Belum ada data {config.label.toLowerCase()}.
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr key={row.kode} className="border-b border-slate-100 dark:border-slate-700/60 last:border-0 hover:bg-slate-50/60 dark:hover:bg-slate-700">
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{idx + 1}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{row.kode}</td>
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{row.uraian}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(row)}
                        title="Ubah"
                        className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(row)}
                        title="Hapus"
                        className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-sm w-full shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                {editingKode !== null ? "Ubah Data" : "Tambah Data"} {config.label}
              </h3>
              <button onClick={() => setShowForm(false)}>
                <X className="h-4 w-4 text-slate-400 dark:text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">Kode</label>
                <input
                  type="number"
                  value={form.kode}
                  onChange={(e) => setForm((f) => ({ ...f, kode: e.target.value }))}
                  disabled={editingKode !== null}
                  required
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-500"
                />
                {editingKode !== null && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Kode tidak bisa diubah.</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">Uraian</label>
                <input
                  type="text"
                  value={form.uraian}
                  onChange={(e) => setForm((f) => ({ ...f, uraian: e.target.value }))}
                  required
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {actionError && (
                <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg px-3 py-2">
                  {actionError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white text-sm font-medium px-4 py-2 hover:bg-indigo-700 disabled:opacity-60"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1.5">Hapus data ini?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
              Kode <span className="font-medium text-slate-700 dark:text-slate-200">{deleteTarget.kode}</span> --{" "}
              <span className="font-medium text-slate-700 dark:text-slate-200">{deleteTarget.uraian}</span> akan dihapus
              permanen.
            </p>
            {actionError && (
              <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg px-3 py-2 mb-4">
                {actionError}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 inline-flex items-center gap-2"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
