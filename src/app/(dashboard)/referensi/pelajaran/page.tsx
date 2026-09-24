"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ChevronLeft, Pencil, Trash2, Loader2, X, Plus, Tags, LayoutGrid } from "lucide-react";

type Row = {
  id: number;
  mapel: string;
  singkatan: string | null;
  jjm: number | null;
  jml_rombel7: number | null;
  jml_rombel8: number | null;
  jml_rombel9: number | null;
  jumlah_rombel: number | null;
};

const KELAS_LABEL = { "7": "VII", "8": "VIII", "9": "IX" } as const;

const emptyForm = { mapel: "", singkatan: "", jjm: "", jml_rombel7: "", jml_rombel8: "", jml_rombel9: "" };

function toIntOrNull(v: string): number | null {
  return v.trim() === "" ? null : Number(v);
}

export default function ReferensiPelajaranPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [showRombelAll, setShowRombelAll] = useState(false);
  const [rombelAll, setRombelAll] = useState({ "7": "", "8": "", "9": "" });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("pelajaran")
      .select("id, mapel, singkatan, jjm, jml_rombel7, jml_rombel8, jml_rombel9, jumlah_rombel")
      .order("id", { ascending: true });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setRows((data ?? []) as Row[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setActionError(null);
    setShowForm(true);
  }

  function openEdit(row: Row) {
    setEditingId(row.id);
    setForm({
      mapel: row.mapel,
      singkatan: row.singkatan ?? "",
      jjm: row.jjm != null ? String(row.jjm) : "",
      jml_rombel7: row.jml_rombel7 != null ? String(row.jml_rombel7) : "",
      jml_rombel8: row.jml_rombel8 != null ? String(row.jml_rombel8) : "",
      jml_rombel9: row.jml_rombel9 != null ? String(row.jml_rombel9) : "",
    });
    setActionError(null);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.mapel.trim()) return;

    const supabase = createClient();
    setSaving(true);
    setActionError(null);

    const r7 = toIntOrNull(form.jml_rombel7);
    const r8 = toIntOrNull(form.jml_rombel8);
    const r9 = toIntOrNull(form.jml_rombel9);
    const payload = {
      mapel: form.mapel.trim(),
      singkatan: form.singkatan.trim() || null,
      jjm: toIntOrNull(form.jjm),
      jml_rombel7: r7,
      jml_rombel8: r8,
      jml_rombel9: r9,
      jumlah_rombel: r7 === null && r8 === null && r9 === null ? null : (r7 ?? 0) + (r8 ?? 0) + (r9 ?? 0),
    };

    if (editingId !== null) {
      const { data, error } = await supabase.from("pelajaran").update(payload).eq("id", editingId).select("id");
      setSaving(false);
      if (error) {
        setActionError(error.message);
        return;
      }
      if (!data || data.length === 0) {
        setActionError("Tidak ada baris yang tersimpan -- kemungkinan akun ini belum punya izin tulis ke tabel pelajaran (jalankan supabase/pelajaran-admin-policy.sql).");
        return;
      }
    } else {
      // pelajaran.id tidak auto-increment -- pakai id terbesar + 1
      const nextId = rows.reduce((max, r) => Math.max(max, r.id), 0) + 1;
      const { error } = await supabase.from("pelajaran").insert({ id: nextId, ...payload });
      setSaving(false);
      if (error) {
        setActionError(error.message);
        return;
      }
    }

    setShowForm(false);
    fetchAll();
  }

  async function handleRombelAll(e: React.FormEvent) {
    e.preventDefault();
    const n7 = Number(rombelAll["7"]);
    const n8 = Number(rombelAll["8"]);
    const n9 = Number(rombelAll["9"]);
    if (
      [rombelAll["7"], rombelAll["8"], rombelAll["9"]].some((s) => s.trim() === "") ||
      ![n7, n8, n9].every((n) => Number.isInteger(n) && n >= 0)
    ) {
      setActionError("Jumlah rombel VII, VIII, dan IX harus berupa angka bulat 0 atau lebih.");
      return;
    }

    setSaving(true);
    setActionError(null);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("pelajaran")
      .update({ jml_rombel7: n7, jml_rombel8: n8, jml_rombel9: n9, jumlah_rombel: n7 + n8 + n9 })
      .in(
        "id",
        rows.map((r) => r.id)
      )
      .select("id");
    setSaving(false);
    if (error) {
      setActionError(error.message);
      return;
    }
    if (!data || data.length === 0) {
      setActionError("Tidak ada baris yang tersimpan -- kemungkinan akun ini belum punya izin tulis ke tabel pelajaran (jalankan supabase/pelajaran-admin-policy.sql).");
      return;
    }
    setShowRombelAll(false);
    fetchAll();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setSaving(true);
    setActionError(null);
    const supabase = createClient();
    const { data, error } = await supabase.from("pelajaran").delete().eq("id", deleteTarget.id).select("id");
    setSaving(false);
    if (!error && (!data || data.length === 0)) {
      setActionError("Tidak ada baris yang tersimpan -- kemungkinan akun ini belum punya izin tulis ke tabel pelajaran (jalankan supabase/pelajaran-admin-policy.sql).");
      return;
    }
    if (error) {
      setActionError(
        error.code === "23503"
          ? "Pelajaran ini sudah dipakai (nilai/presensi/penugasan guru), tidak bisa dihapus."
          : error.message
      );
      return;
    }
    setDeleteTarget(null);
    fetchAll();
  }

  const inputClass =
    "w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500";
  const labelClass = "block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5";

  return (
    <div className="p-6 md:p-8">
      <Link
        href="/referensi"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 mb-4"
      >
        <ChevronLeft className="h-4 w-4" />
        Kembali ke Referensi
      </Link>

      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Referensi Pelajaran</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Daftar mata pelajaran beserta singkatan, JJM per rombel, dan jumlah rombel
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              setRombelAll({ "7": "", "8": "", "9": "" });
              setActionError(null);
              setShowRombelAll(true);
            }}
            disabled={rows.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
          >
            <LayoutGrid className="h-4 w-4" />
            Isi Jumlah Rombel Semua
          </button>
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white text-sm font-medium px-4 py-2 hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            Tambah Data
          </button>
        </div>
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
              <th className="px-4 py-3 font-medium">Mata Pelajaran</th>
              <th className="px-4 py-3 font-medium">Singkatan</th>
              <th className="px-4 py-3 font-medium text-center">JJM</th>
              <th className="px-4 py-3 font-medium text-center">VII</th>
              <th className="px-4 py-3 font-medium text-center">VIII</th>
              <th className="px-4 py-3 font-medium text-center">IX</th>
              <th className="px-4 py-3 font-medium text-center">Total Rombel</th>
              <th className="px-4 py-3 font-medium text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500">
                  <Tags className="h-6 w-6 mx-auto mb-2 text-slate-300" />
                  Belum ada data pelajaran.
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr
                  key={row.id}
                  className="border-b border-slate-100 dark:border-slate-700/60 last:border-0 hover:bg-slate-50/60 dark:hover:bg-slate-700"
                >
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{idx + 1}</td>
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{row.mapel}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{row.singkatan || "-"}</td>
                  <td className="px-4 py-3 text-center text-slate-700 dark:text-slate-200">{row.jjm ?? "-"}</td>
                  <td className="px-4 py-3 text-center text-slate-700 dark:text-slate-200">{row.jml_rombel7 ?? "-"}</td>
                  <td className="px-4 py-3 text-center text-slate-700 dark:text-slate-200">{row.jml_rombel8 ?? "-"}</td>
                  <td className="px-4 py-3 text-center text-slate-700 dark:text-slate-200">{row.jml_rombel9 ?? "-"}</td>
                  <td className="px-4 py-3 text-center font-medium text-slate-800 dark:text-slate-200">
                    {row.jumlah_rombel ?? "-"}
                  </td>
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
                        onClick={() => {
                          setActionError(null);
                          setDeleteTarget(row);
                        }}
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
                {editingId !== null ? "Ubah" : "Tambah"} Pelajaran
              </h3>
              <button onClick={() => setShowForm(false)}>
                <X className="h-4 w-4 text-slate-400 dark:text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={labelClass}>Mata Pelajaran</label>
                <input
                  type="text"
                  value={form.mapel}
                  onChange={(e) => setForm((f) => ({ ...f, mapel: e.target.value }))}
                  required
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Singkatan</label>
                <input
                  type="text"
                  value={form.singkatan}
                  onChange={(e) => setForm((f) => ({ ...f, singkatan: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>JJM</label>
                <input
                  type="number"
                  min={0}
                  value={form.jjm}
                  onChange={(e) => setForm((f) => ({ ...f, jjm: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div>
                <div className="grid grid-cols-3 gap-3">
                  {(["7", "8", "9"] as const).map((k) => (
                    <div key={k}>
                      <label className={labelClass}>Rombel {KELAS_LABEL[k]}</label>
                      <input
                        type="number"
                        min={0}
                        value={form[`jml_rombel${k}` as const]}
                        onChange={(e) => setForm((f) => ({ ...f, [`jml_rombel${k}`]: e.target.value }))}
                        className={inputClass}
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                  Total Rombel otomatis = VII + VIII + IX.
                </p>
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

      {showRombelAll && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-sm w-full shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">Isi Jumlah Rombel Semua Mapel</h3>
              <button onClick={() => setShowRombelAll(false)}>
                <X className="h-4 w-4 text-slate-400 dark:text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleRombelAll} className="space-y-4">
              <div>
                <div className="grid grid-cols-3 gap-3">
                  {(["7", "8", "9"] as const).map((k) => (
                    <div key={k}>
                      <label className={labelClass}>{KELAS_LABEL[k]}</label>
                      <input
                        type="number"
                        min={0}
                        value={rombelAll[k]}
                        onChange={(e) => setRombelAll((r) => ({ ...r, [k]: e.target.value }))}
                        required
                        autoFocus={k === "7"}
                        className={inputClass}
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                  Angka ini akan diisi ke {rows.length} mata pelajaran sekaligus (menimpa nilai yang sudah ada).
                  Total Rombel otomatis = VII + VIII + IX.
                </p>
              </div>
              {actionError && (
                <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg px-3 py-2">
                  {actionError}
                </p>
              )}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowRombelAll(false)}
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
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1.5">Hapus pelajaran ini?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
              <span className="font-medium text-slate-700 dark:text-slate-200">{deleteTarget.mapel}</span> akan
              dihapus permanen.
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
