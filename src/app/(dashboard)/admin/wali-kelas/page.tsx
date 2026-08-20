"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { compareKelas } from "@/lib/rekap-siswa";
import { Pencil, Trash2, Loader2, X, UserRound, Plus } from "lucide-react";

type GtkOption = { id: string; nama: string | null; nip: string | null };

type WaliKelasRow = { id: string; gtk_id: string; rombel: string };

export default function WaliKelasPage() {
  const [rombelList, setRombelList] = useState<string[]>([]);
  const [waliList, setWaliList] = useState<WaliKelasRow[]>([]);
  const [gtkOptions, setGtkOptions] = useState<GtkOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<WaliKelasRow | null>(null);
  const [formRombel, setFormRombel] = useState("");
  const [formGtkId, setFormGtkId] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const [rombelRes, waliRes, gtkRes] = await Promise.all([
      supabase.from("siswa01").select("rombel").not("rombel", "is", null),
      supabase.from("wali_kelas").select("id, gtk_id, rombel"),
      supabase.from("datagtk").select("id, nama, nip").order("nama", { ascending: true }),
    ]);

    if (rombelRes.error) {
      setError(rombelRes.error.message);
      setLoading(false);
      return;
    }

    const uniqueRombel = Array.from(
      new Set((rombelRes.data ?? []).map((r) => r.rombel).filter(Boolean) as string[])
    ).sort(compareKelas);

    setRombelList(uniqueRombel);
    setWaliList(waliRes.data ?? []);
    setGtkOptions(gtkRes.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const gtkMap = new Map(gtkOptions.map((g) => [g.id, g]));
  const waliByRombel = new Map(waliList.map((w) => [w.rombel, w]));

  function openAssign(rombel: string) {
    setIsNew(false);
    setFormRombel(rombel);
    setFormGtkId(waliByRombel.get(rombel)?.gtk_id ?? "");
    setActionError(null);
    setShowForm(true);
  }

  function openAdd() {
    setIsNew(true);
    setFormRombel("");
    setFormGtkId("");
    setActionError(null);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formRombel || !formGtkId) return;

    setSaving(true);
    setActionError(null);
    const supabase = createClient();

    const { error } = await supabase
      .from("wali_kelas")
      .upsert({ rombel: formRombel, gtk_id: formGtkId }, { onConflict: "rombel" });

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
    const { error } = await supabase.from("wali_kelas").delete().eq("id", deleteTarget.id);
    setSaving(false);
    if (!error) {
      setDeleteTarget(null);
      fetchAll();
    } else {
      setActionError(error.message);
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Wali Kelas</h1>
          <p className="text-sm text-slate-500 mt-1">
            Tentukan guru yang menjadi wali kelas untuk tiap rombel
          </p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white text-sm font-medium px-4 py-2.5 hover:bg-indigo-700 transition-colors shrink-0"
        >
          <Plus className="h-4 w-4" />
          Tambah Wali Kelas
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">
          {error}
        </p>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
              <th className="px-4 py-3 font-medium w-12">No</th>
              <th className="px-4 py-3 font-medium">Rombel</th>
              <th className="px-4 py-3 font-medium">Wali Kelas</th>
              <th className="px-4 py-3 font-medium">NIP</th>
              <th className="px-4 py-3 font-medium text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                </td>
              </tr>
            ) : rombelList.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                  Belum ada data rombel (isi data siswa dulu).
                </td>
              </tr>
            ) : (
              rombelList.map((rombel, idx) => {
                const wali = waliByRombel.get(rombel);
                const gtk = wali ? gtkMap.get(wali.gtk_id) : null;
                return (
                  <tr key={rombel} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                    <td className="px-4 py-3 text-slate-500">{idx + 1}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{rombel}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {gtk ? (
                        <span className="inline-flex items-center gap-1.5">
                          <UserRound className="h-3.5 w-3.5 text-slate-400" />
                          {gtk.nama}
                        </span>
                      ) : (
                        <span className="text-slate-400">- Belum ditentukan -</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{gtk?.nip || "-"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openAssign(rombel)}
                          title={wali ? "Ubah" : "Tentukan"}
                          className="p-2 rounded-lg text-slate-500 hover:bg-indigo-50 hover:text-indigo-600"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        {wali && (
                          <button
                            onClick={() => setDeleteTarget(wali)}
                            title="Hapus"
                            className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600"
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
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">
                {isNew ? "Tambah Wali Kelas" : `Wali Kelas ${formRombel}`}
              </h3>
              <button onClick={() => setShowForm(false)}>
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Rombel
                </label>
                <select
                  value={formRombel}
                  onChange={(e) => setFormRombel(e.target.value)}
                  required
                  disabled={!isNew}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white disabled:bg-slate-50 disabled:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Pilih rombel --</option>
                  {rombelList.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Pilih Guru
                </label>
                <select
                  value={formGtkId}
                  onChange={(e) => setFormGtkId(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {actionError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100"
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
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-semibold text-slate-900 mb-1.5">Hapus penugasan wali kelas?</h3>
            <p className="text-sm text-slate-500 mb-5">
              Guru ini tidak akan lagi jadi wali kelas{" "}
              <span className="font-medium text-slate-700">{deleteTarget.rombel}</span>.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100"
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
