"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRole } from "@/lib/role-context";
import { JadwalKombel } from "@/types/kombel";
import { Pencil, Trash2, Loader2, X, Plus, CalendarClock, Calendar } from "lucide-react";

type GtkOption = { id: string; nama: string | null; nip: string | null };

type AddRow = { gtk_id: string; nama: string; checked: boolean; tanggal: string; topik_materi: string };

const emptyEditForm = { tanggal: "", topik_materi: "", gtk_id: "" };

function formatTanggal(tanggal: string) {
  return new Date(`${tanggal}T00:00:00`).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatBulan(tanggal: string) {
  return new Date(`${tanggal}T00:00:00`).toLocaleDateString("id-ID", { month: "long" });
}

/** Pekan ke berapa dalam bulan berjalan, dihitung otomatis dari tanggal
 *  (contoh: tanggal 30 -> pekan 5). Tidak diminta manual dari user. */
function computePekanKe(tanggal: string) {
  const day = new Date(`${tanggal}T00:00:00`).getDate();
  return Math.ceil(day / 7);
}

function dateInputId(gtkId: string) {
  return `jadwal-kombel-tanggal-${gtkId}`;
}

export default function JadwalKombelPage() {
  const { role } = useRole();
  const canEdit = role === "admin" || role === "kepala_sekolah";

  const [jadwalList, setJadwalList] = useState<JadwalKombel[]>([]);
  const [gtkOptions, setGtkOptions] = useState<GtkOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [addRows, setAddRows] = useState<AddRow[]>([]);

  const [editTarget, setEditTarget] = useState<JadwalKombel | null>(null);
  const [editForm, setEditForm] = useState(emptyEditForm);

  const [deleteTarget, setDeleteTarget] = useState<JadwalKombel | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const [jadwalRes, gtkRes] = await Promise.all([
      supabase
        .from("jadwal_kombel")
        .select("id, tanggal, pekan_ke, gtk_id, topik_materi")
        .order("tanggal", { ascending: true }),
      supabase.from("datagtk").select("id, nama, nip").order("nama", { ascending: true }),
    ]);

    if (jadwalRes.error) {
      setError(jadwalRes.error.message);
      setLoading(false);
      return;
    }

    setJadwalList(jadwalRes.data ?? []);
    setGtkOptions(gtkRes.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const gtkMap = useMemo(() => new Map(gtkOptions.map((g) => [g.id, g])), [gtkOptions]);

  function openAdd() {
    setAddRows(
      gtkOptions.map((g) => ({
        gtk_id: g.id,
        nama: g.nama ?? "-",
        checked: false,
        tanggal: "",
        topik_materi: "",
      }))
    );
    setActionError(null);
    setShowAddForm(true);
  }

  function updateAddRow(gtkId: string, patch: Partial<AddRow>) {
    setAddRows((rows) => rows.map((r) => (r.gtk_id === gtkId ? { ...r, ...patch } : r)));
  }

  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    const checkedRows = addRows.filter((r) => r.checked);

    if (checkedRows.length === 0) {
      setActionError("Centang minimal satu guru.");
      return;
    }
    if (checkedRows.some((r) => !r.tanggal)) {
      setActionError("Isi tanggal untuk setiap guru yang dicentang.");
      return;
    }

    setSaving(true);
    setActionError(null);
    const supabase = createClient();

    const payload = checkedRows.map((r) => ({
      gtk_id: r.gtk_id,
      tanggal: r.tanggal,
      pekan_ke: computePekanKe(r.tanggal),
      topik_materi: r.topik_materi || null,
    }));

    const { error } = await supabase.from("jadwal_kombel").insert(payload);
    setSaving(false);

    if (error) {
      setActionError(error.message);
      return;
    }

    setShowAddForm(false);
    fetchAll();
  }

  function openEdit(row: JadwalKombel) {
    setEditTarget(row);
    setEditForm({
      tanggal: row.tanggal,
      topik_materi: row.topik_materi ?? "",
      gtk_id: row.gtk_id ?? "",
    });
    setActionError(null);
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget || !editForm.tanggal || !editForm.gtk_id) return;

    setSaving(true);
    setActionError(null);
    const supabase = createClient();

    const { error } = await supabase
      .from("jadwal_kombel")
      .update({
        tanggal: editForm.tanggal,
        pekan_ke: computePekanKe(editForm.tanggal),
        gtk_id: editForm.gtk_id,
        topik_materi: editForm.topik_materi || null,
      })
      .eq("id", editTarget.id);

    setSaving(false);

    if (error) {
      setActionError(error.message);
      return;
    }

    setEditTarget(null);
    fetchAll();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("jadwal_kombel").delete().eq("id", deleteTarget.id);
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
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Jadwal Kombel</h1>
          <p className="text-sm text-slate-500 mt-1">
            Jadwal kegiatan Komunitas Belajar (Kombel) guru
          </p>
        </div>
        {canEdit && (
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white text-sm font-medium px-4 py-2 hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            Tambah Jadwal
          </button>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">
          {error}
        </p>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
              <th className="px-4 py-3 font-medium w-12">No</th>
              <th className="px-4 py-3 font-medium">Bulan</th>
              <th className="px-4 py-3 font-medium">Pekan ke</th>
              <th className="px-4 py-3 font-medium">Tanggal</th>
              <th className="px-4 py-3 font-medium">Nama Guru</th>
              <th className="px-4 py-3 font-medium">Topik Materi</th>
              {canEdit && <th className="px-4 py-3 font-medium text-right">Aksi</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={canEdit ? 7 : 6} className="px-4 py-10 text-center text-slate-400">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                </td>
              </tr>
            ) : jadwalList.length === 0 ? (
              <tr>
                <td colSpan={canEdit ? 7 : 6} className="px-4 py-10 text-center text-slate-400">
                  <CalendarClock className="h-6 w-6 mx-auto mb-2 text-slate-300" />
                  Belum ada jadwal Kombel.
                </td>
              </tr>
            ) : (
              jadwalList.map((row, idx) => {
                const gtk = row.gtk_id ? gtkMap.get(row.gtk_id) : null;
                return (
                  <tr key={row.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                    <td className="px-4 py-3 text-slate-500">{idx + 1}</td>
                    <td className="px-4 py-3 text-slate-700 capitalize">{formatBulan(row.tanggal)}</td>
                    <td className="px-4 py-3 text-slate-700">{computePekanKe(row.tanggal)}</td>
                    <td className="px-4 py-3 text-slate-700">{formatTanggal(row.tanggal)}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {gtk ? gtk.nama : <span className="text-slate-400 font-normal">- Tidak diketahui -</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{row.topik_materi || "-"}</td>
                    {canEdit && (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(row)}
                            title="Ubah"
                            className="p-2 rounded-lg text-slate-500 hover:bg-indigo-50 hover:text-indigo-600"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(row)}
                            title="Hapus"
                            className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Tambah Jadwal: tabel per guru -- cheklist, tanggal, topik materi
          diisi per baris. Bulan & Pekan ke otomatis dihitung dari tanggal. */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-3xl w-full shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-4 shrink-0">
              <div>
                <h3 className="font-semibold text-slate-900">Tambah Jadwal Kombel</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Centang guru, lalu isi tanggal & topik materi untuk tiap guru
                </p>
              </div>
              <button onClick={() => setShowAddForm(false)}>
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="flex flex-col min-h-0 flex-1">
              <div className="border border-slate-200 rounded-lg overflow-auto flex-1">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-50">
                    <tr className="border-b border-slate-200 text-left text-slate-500">
                      <th className="px-3 py-2.5 font-medium w-16">Cheklist</th>
                      <th className="px-3 py-2.5 font-medium w-12">No</th>
                      <th className="px-3 py-2.5 font-medium">Guru</th>
                      <th className="px-3 py-2.5 font-medium w-44">Tanggal</th>
                      <th className="px-3 py-2.5 font-medium">Topik Materi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {addRows.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-8 text-center text-slate-400">
                          Belum ada data guru.
                        </td>
                      </tr>
                    ) : (
                      addRows.map((row, idx) => (
                        <tr key={row.gtk_id} className="border-b border-slate-100 last:border-0">
                          <td className="px-3 py-2 align-top">
                            <input
                              type="checkbox"
                              checked={row.checked}
                              onChange={(e) => updateAddRow(row.gtk_id, { checked: e.target.checked })}
                              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                          </td>
                          <td className="px-3 py-2 align-top text-slate-500">{idx + 1}</td>
                          <td className="px-3 py-2 align-top text-slate-700">{row.nama}</td>
                          <td className="px-3 py-2 align-top">
                            <div className="relative">
                              <input
                                id={dateInputId(row.gtk_id)}
                                type="date"
                                value={row.tanggal}
                                disabled={!row.checked}
                                onChange={(e) => updateAddRow(row.gtk_id, { tanggal: e.target.value })}
                                className="jadwal-date-input w-full rounded-lg border border-slate-300 pl-2 pr-8 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-400"
                              />
                              <button
                                type="button"
                                tabIndex={-1}
                                disabled={!row.checked}
                                onClick={() =>
                                  (document.getElementById(dateInputId(row.gtk_id)) as HTMLInputElement | null)?.showPicker?.()
                                }
                                className="absolute inset-y-0 right-0 flex items-center px-2 text-slate-400 hover:text-indigo-600 disabled:hover:text-slate-400"
                              >
                                <Calendar className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                          <td className="px-3 py-2 align-top">
                            <input
                              type="text"
                              value={row.topik_materi}
                              disabled={!row.checked}
                              onChange={(e) => updateAddRow(row.gtk_id, { topik_materi: e.target.value })}
                              className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-400"
                            />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {actionError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mt-4 shrink-0">
                  {actionError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-4 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
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

      {editTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">Ubah Jadwal Kombel</h3>
              <button onClick={() => setEditTarget(null)}>
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Tanggal</label>
                <div className="relative">
                  <input
                    id="jadwal-kombel-edit-tanggal"
                    type="date"
                    value={editForm.tanggal}
                    onChange={(e) => setEditForm((f) => ({ ...f, tanggal: e.target.value }))}
                    required
                    className="jadwal-date-input w-full rounded-lg border border-slate-300 pl-3 pr-10 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() =>
                      (document.getElementById("jadwal-kombel-edit-tanggal") as HTMLInputElement | null)?.showPicker?.()
                    }
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-indigo-600"
                  >
                    <Calendar className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Nama Guru</label>
                <select
                  value={editForm.gtk_id}
                  onChange={(e) => setEditForm((f) => ({ ...f, gtk_id: e.target.value }))}
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

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Topik Materi</label>
                <textarea
                  value={editForm.topik_materi}
                  onChange={(e) => setEditForm((f) => ({ ...f, topik_materi: e.target.value }))}
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {actionError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {actionError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setEditTarget(null)}
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
            <h3 className="font-semibold text-slate-900 mb-1.5">Hapus jadwal Kombel ini?</h3>
            <p className="text-sm text-slate-500 mb-5">
              Jadwal tanggal{" "}
              <span className="font-medium text-slate-700">{formatTanggal(deleteTarget.tanggal)}</span> akan
              dihapus permanen.
            </p>
            {actionError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">
                {actionError}
              </p>
            )}
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
