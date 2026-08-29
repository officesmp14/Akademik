"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Pencil, Trash2, Loader2, X, UserRound, Plus } from "lucide-react";

type GtkOption = { id: string; nama: string | null; nip: string | null };
type EkskulOption = { kode: number; uraian: string };
type KetuaEkskulRow = { id: string; gtk_id: string; ekskul_kode: number };

export default function KetuaEkskulPage() {
  const [ekskulList, setEkskulList] = useState<EkskulOption[]>([]);
  const [ketuaList, setKetuaList] = useState<KetuaEkskulRow[]>([]);
  const [gtkOptions, setGtkOptions] = useState<GtkOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<KetuaEkskulRow | null>(null);
  const [formEkskulKode, setFormEkskulKode] = useState("");
  const [formGtkId, setFormGtkId] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const [ekskulRes, ketuaRes, gtkRes] = await Promise.all([
      supabase.from("ref_ekstrakurikuler").select("kode, uraian").order("uraian", { ascending: true }),
      supabase.from("ketua_ekskul").select("id, gtk_id, ekskul_kode"),
      supabase.from("datagtk").select("id, nama, nip").order("nama", { ascending: true }),
    ]);

    if (ekskulRes.error) {
      setError(ekskulRes.error.message);
      setLoading(false);
      return;
    }

    setEkskulList(ekskulRes.data ?? []);
    setKetuaList(ketuaRes.data ?? []);
    setGtkOptions(gtkRes.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const gtkMap = new Map(gtkOptions.map((g) => [g.id, g]));
  const ketuaByEkskul = new Map(ketuaList.map((k) => [k.ekskul_kode, k]));

  function openAssign(ekskulKode: number) {
    setIsNew(false);
    setFormEkskulKode(String(ekskulKode));
    setFormGtkId(ketuaByEkskul.get(ekskulKode)?.gtk_id ?? "");
    setActionError(null);
    setShowForm(true);
  }

  function openAdd() {
    setIsNew(true);
    setFormEkskulKode("");
    setFormGtkId("");
    setActionError(null);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formEkskulKode || !formGtkId) return;

    setSaving(true);
    setActionError(null);
    const supabase = createClient();

    const { error } = await supabase
      .from("ketua_ekskul")
      .upsert({ ekskul_kode: Number(formEkskulKode), gtk_id: formGtkId }, { onConflict: "ekskul_kode" });

    setSaving(false);

    if (error) {
      setActionError(error.message);
      return;
    }

    setShowForm(false);
    fetchAll();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("ketua_ekskul").delete().eq("id", deleteTarget.id);
    setSaving(false);
    if (!error) {
      setDeleteTarget(null);
      fetchAll();
    } else {
      setActionError(error.message);
    }
  }

  const deleteTargetEkskul = deleteTarget
    ? ekskulList.find((e) => e.kode === deleteTarget.ekskul_kode)
    : null;

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto dark:bg-slate-900 min-h-full">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Ketua Ekstrakurikuler</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Tentukan guru yang menjadi ketua untuk tiap ekstrakurikuler. Daftar ekstrakurikuler
            dikelola lewat menu Referensi.
          </p>
        </div>
        <button
          onClick={openAdd}
          disabled={ekskulList.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white text-sm font-medium px-4 py-2.5 hover:bg-indigo-700 transition-colors shrink-0 disabled:opacity-60"
        >
          <Plus className="h-4 w-4" />
          Tambah Ketua Ekskul
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg px-3 py-2 mb-4">
          {error}
        </p>
      )}

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40 text-left text-slate-500 dark:text-slate-400">
              <th className="px-4 py-3 font-medium w-12">No</th>
              <th className="px-4 py-3 font-medium">Ekstrakurikuler</th>
              <th className="px-4 py-3 font-medium">Ketua</th>
              <th className="px-4 py-3 font-medium">NIP</th>
              <th className="px-4 py-3 font-medium text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                </td>
              </tr>
            ) : ekskulList.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500">
                  Belum ada data ekstrakurikuler. Tambahkan dulu lewat menu Referensi.
                </td>
              </tr>
            ) : (
              ekskulList.map((ekskul, idx) => {
                const ketua = ketuaByEkskul.get(ekskul.kode);
                const gtk = ketua ? gtkMap.get(ketua.gtk_id) : null;
                return (
                  <tr key={ekskul.kode} className="border-b border-slate-100 dark:border-slate-700/60 last:border-0 hover:bg-slate-50/60 dark:hover:bg-slate-700/60">
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{idx + 1}</td>
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{ekskul.uraian}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                      {gtk ? (
                        <span className="inline-flex items-center gap-1.5">
                          <UserRound className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                          {gtk.nama}
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500">- Belum ditentukan -</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{gtk?.nip || "-"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openAssign(ekskul.kode)}
                          title={ketua ? "Ubah" : "Tentukan"}
                          className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        {ketua && (
                          <button
                            onClick={() => setDeleteTarget(ketua)}
                            title="Hapus"
                            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-sm w-full shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                {isNew
                  ? "Tambah Ketua Ekskul"
                  : `Ketua ${ekskulList.find((e) => String(e.kode) === formEkskulKode)?.uraian ?? ""}`}
              </h3>
              <button onClick={() => setShowForm(false)}>
                <X className="h-4 w-4 text-slate-400 dark:text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                  Ekstrakurikuler
                </label>
                <select
                  value={formEkskulKode}
                  onChange={(e) => setFormEkskulKode(e.target.value)}
                  required
                  disabled={!isNew}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 disabled:bg-slate-50 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Pilih ekstrakurikuler --</option>
                  {ekskulList.map((e) => (
                    <option key={e.kode} value={e.kode}>
                      {e.uraian}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                  Pilih Guru
                </label>
                <select
                  value={formGtkId}
                  onChange={(e) => setFormGtkId(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Pilih guru --</option>
                  {gtkOptions.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.nama} {g.nip ? `(NIP: ${g.nip})` : ""}
                    </option>
                  ))}
                </select>
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
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1.5">Hapus penugasan ketua ekskul?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
              Guru ini tidak akan lagi jadi ketua{" "}
              <span className="font-medium text-slate-700 dark:text-slate-200">{deleteTargetEkskul?.uraian}</span>.
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
