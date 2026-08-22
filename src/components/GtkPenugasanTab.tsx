"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { GtkPenugasanMengajar, JENJANG_SEKOLAH_OPTIONS, STATUS_SEKOLAH_OPTIONS } from "@/types/gtk";
import { TextField, SelectField } from "@/components/form-fields";
import { useForm } from "react-hook-form";
import { Plus, Pencil, Trash2, Loader2, X } from "lucide-react";

export default function GtkPenugasanTab({
  gtkId,
  readOnly = false,
}: {
  gtkId: string;
  readOnly?: boolean;
}) {
  const [list, setList] = useState<GtkPenugasanMengajar[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<GtkPenugasanMengajar | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GtkPenugasanMengajar | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { register, handleSubmit, reset } = useForm<GtkPenugasanMengajar>();

  const fetchList = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("gtk_penugasan_mengajar")
      .select("*")
      .eq("gtk_id", gtkId)
      .order("created_at", { ascending: true });

    if (!error) setList(data ?? []);
    setLoading(false);
  }, [gtkId]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  function openAdd() {
    setEditing(null);
    reset({ gtk_id: gtkId });
    setShowForm(true);
  }

  function openEdit(item: GtkPenugasanMengajar) {
    setEditing(item);
    reset(item);
    setShowForm(true);
  }

  async function onSubmit(values: GtkPenugasanMengajar) {
    setSaving(true);
    const supabase = createClient();

    const payload = Object.fromEntries(
      Object.entries({ ...values, gtk_id: gtkId }).map(([k, v]) => [k, v === "" ? null : v])
    );

    const { error } = editing?.id
      ? await supabase.from("gtk_penugasan_mengajar").update(payload).eq("id", editing.id)
      : await supabase.from("gtk_penugasan_mengajar").insert(payload);

    setSaving(false);

    if (!error) {
      setShowForm(false);
      fetchList();
    }
  }

  async function handleDelete() {
    if (!deleteTarget?.id) return;
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("gtk_penugasan_mengajar")
      .delete()
      .eq("id", deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
    if (!error) fetchList();
  }

  const totalJjm = list.reduce((acc, item) => {
    const n = parseFloat(item.jjm ?? "0");
    return acc + (isNaN(n) ? 0 : n);
  }, 0);

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Penugasan Mengajar</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Satu guru bisa punya lebih dari satu penugasan (mapel/sekolah berbeda)
          </p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className={`inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white text-sm font-medium px-4 py-2 hover:bg-indigo-700 transition-colors ${readOnly ? "hidden" : ""}`}
        >
          <Plus className="h-4 w-4" />
          Tambah Penugasan
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400 dark:text-slate-500" />
        </div>
      ) : list.length === 0 ? (
        <div className="text-center py-10 text-sm text-slate-400 dark:text-slate-500">
          Belum ada penugasan mengajar. Klik &quot;Tambah Penugasan&quot; untuk menambahkan.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40 text-left text-slate-500 dark:text-slate-400">
                <th className="px-3 py-2.5 font-medium">Sekolah</th>
                <th className="px-3 py-2.5 font-medium">Jenjang</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-3 py-2.5 font-medium">Mengajar</th>
                <th className="px-3 py-2.5 font-medium">Kompetensi</th>
                <th className="px-3 py-2.5 font-medium text-center">JJM</th>
                <th className="px-3 py-2.5 font-medium text-center">Jml Siswa</th>
                <th className="px-3 py-2.5 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {list.map((item) => (
                <tr key={item.id} className="border-b border-slate-100 dark:border-slate-700/60 last:border-0">
                  <td className="px-3 py-2.5 text-slate-700 dark:text-slate-200">{item.nama_sekolah || "-"}</td>
                  <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">{item.jenjang_sekolah || "-"}</td>
                  <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">{item.status_sekolah || "-"}</td>
                  <td className="px-3 py-2.5 text-slate-700 dark:text-slate-200 font-medium">{item.mengajar || "-"}</td>
                  <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">{item.kompetensi || "-"}</td>
                  <td className="px-3 py-2.5 text-center text-slate-700 dark:text-slate-200">{item.jjm || "-"}</td>
                  <td className="px-3 py-2.5 text-center text-slate-600 dark:text-slate-300">{item.jumlah_siswa_diajar || "-"}</td>
                  <td className="px-3 py-2.5">
                    <div className={`flex items-center justify-end gap-1 ${readOnly ? "hidden" : ""}`}>
                      <button
                        type="button"
                        onClick={() => openEdit(item)}
                        className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(item)}
                        className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 dark:bg-slate-700/40 border-t border-slate-200 dark:border-slate-700 font-semibold text-slate-800 dark:text-slate-200">
                <td className="px-3 py-2.5" colSpan={5}>
                  Total JJM
                </td>
                <td className="px-3 py-2.5 text-center">{totalJjm || "-"}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Modal tambah/edit */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-lg w-full shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                {editing ? "Edit Penugasan" : "Tambah Penugasan"}
              </h3>
              <button type="button" onClick={() => setShowForm(false)}>
                <X className="h-4 w-4 text-slate-400 dark:text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="grid sm:grid-cols-2 gap-4 mb-5">
                <TextField label="Nama Sekolah" name="nama_sekolah" register={register} />
                <SelectField
                  label="Jenjang Sekolah"
                  name="jenjang_sekolah"
                  register={register}
                  options={JENJANG_SEKOLAH_OPTIONS}
                />
                <SelectField
                  label="Status Sekolah"
                  name="status_sekolah"
                  register={register}
                  options={STATUS_SEKOLAH_OPTIONS}
                />
                <TextField label="Kecamatan Sekolah" name="kecamatan_sekolah" register={register} />
                <TextField label="Mengajar (Mapel)" name="mengajar" register={register} />
                <TextField label="Kompetensi" name="kompetensi" register={register} />
                <TextField label="Jam Tugas Tambahan" name="jam_tugas_tambahan" register={register} />
                <TextField label="JJM" name="jjm" type="number" register={register} />
                <TextField label="Jumlah Siswa Diajar" name="jumlah_siswa_diajar" type="number" register={register} />
              </div>

              <div className="flex justify-end gap-2">
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

      {/* Konfirmasi hapus */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1.5">Hapus penugasan ini?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
              Penugasan mengajar{" "}
              <span className="font-medium text-slate-700 dark:text-slate-200">{deleteTarget.mengajar}</span> di{" "}
              <span className="font-medium text-slate-700 dark:text-slate-200">{deleteTarget.nama_sekolah}</span> akan
              dihapus permanen.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                Batal
              </button>
              <button
                type="button"
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
