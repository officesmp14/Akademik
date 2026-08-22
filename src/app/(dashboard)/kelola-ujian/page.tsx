"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRole } from "@/lib/role-context";
import { Ujian } from "@/types/ujian";
import { Plus, Loader2, X, ClipboardList, ChevronRight } from "lucide-react";

const emptyForm = { judul: "", mapel: "", durasi_menit: 60, acak_soal: true };

const STATUS_LABEL: Record<Ujian["status"], string> = {
  draft: "Draft",
  terbit: "Terbit",
  arsip: "Arsip",
};

const STATUS_BADGE: Record<Ujian["status"], string> = {
  draft: "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300",
  terbit: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  arsip: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400",
};

export default function KelolaUjianPage() {
  const router = useRouter();
  const { role, gtkId } = useRole();
  const isFullAccess = role === "admin" || role === "kepala_sekolah";

  const [list, setList] = useState<Ujian[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();

    let query = supabase.from("ujian").select("*").order("created_at", { ascending: false });
    if (!isFullAccess && gtkId) {
      query = query.eq("dibuat_oleh", gtkId);
    }

    const { data, error } = await query;
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setList(data ?? []);
    setLoading(false);
  }, [isFullAccess, gtkId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  function openAdd() {
    setForm(emptyForm);
    setActionError(null);
    setShowAddForm(true);
  }

  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.judul.trim()) {
      setActionError("Judul wajib diisi.");
      return;
    }

    setSaving(true);
    setActionError(null);
    const supabase = createClient();

    const { data, error } = await supabase
      .from("ujian")
      .insert({
        judul: form.judul.trim(),
        mapel: form.mapel.trim() || null,
        durasi_menit: form.durasi_menit,
        acak_soal: form.acak_soal,
        dibuat_oleh: gtkId,
        status: "draft",
      })
      .select("id")
      .single();

    setSaving(false);

    if (error || !data) {
      setActionError(error?.message ?? "Gagal membuat ujian.");
      return;
    }

    router.push(`/kelola-ujian/${data.id}`);
  }

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Kelola Ujian</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Buat ujian, bank soal, dan sesi ujian online siswa</p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white text-sm font-medium px-4 py-2 hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          Buat Ujian
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg px-3 py-2 mb-4">{error}</p>
      )}

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40 text-left text-slate-500 dark:text-slate-400">
              <th className="px-4 py-3 font-medium">Judul</th>
              <th className="px-4 py-3 font-medium">Mapel</th>
              <th className="px-4 py-3 font-medium">Durasi</th>
              <th className="px-4 py-3 font-medium">Status</th>
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
            ) : list.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500">
                  <ClipboardList className="h-6 w-6 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                  Belum ada ujian dibuat.
                </td>
              </tr>
            ) : (
              list.map((u) => (
                <tr
                  key={u.id}
                  onClick={() => router.push(`/kelola-ujian/${u.id}`)}
                  className="border-b border-slate-100 dark:border-slate-700/60 last:border-0 hover:bg-slate-50/60 dark:hover:bg-slate-700/40 cursor-pointer"
                >
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{u.judul}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{u.mapel || "-"}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{u.durasi_menit} menit</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[u.status]}`}>
                      {STATUS_LABEL[u.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ChevronRight className="h-4 w-4 text-slate-400 dark:text-slate-500 inline-block" />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showAddForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-sm w-full shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">Buat Ujian Baru</h3>
              <button onClick={() => setShowAddForm(false)}>
                <X className="h-4 w-4 text-slate-400 dark:text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">Judul Ujian</label>
                <input
                  value={form.judul}
                  onChange={(e) => setForm((f) => ({ ...f, judul: e.target.value }))}
                  required
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Contoh: Ulangan Harian Bab 1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">Mata Pelajaran</label>
                <input
                  value={form.mapel}
                  onChange={(e) => setForm((f) => ({ ...f, mapel: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">Durasi (menit)</label>
                <input
                  type="number"
                  min={1}
                  value={form.durasi_menit}
                  onChange={(e) => setForm((f) => ({ ...f, durasi_menit: Number(e.target.value) }))}
                  required
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={form.acak_soal}
                  onChange={(e) => setForm((f) => ({ ...f, acak_soal: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500"
                />
                Acak urutan soal untuk tiap siswa
              </label>

              {actionError && (
                <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg px-3 py-2">
                  {actionError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
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
                  Lanjut Tambah Soal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
