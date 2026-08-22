"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { compareKelas } from "@/lib/rekap-siswa";
import { GuruMengajarKelas, Pelajaran } from "@/types/nilai";
import { Plus, Pencil, Trash2, Loader2, X } from "lucide-react";

type GtkOption = { id: string; nama: string | null; nip: string | null };

type Group = {
  key: string;
  gtk_id: string;
  mapel_id: number;
  rombelList: string[];
  ids: string[]; // id baris di DB untuk tiap rombel (dipakai saat hapus/edit)
};

export default function MengajarKelasPage() {
  const [list, setList] = useState<GuruMengajarKelas[]>([]);
  const [gtkOptions, setGtkOptions] = useState<GtkOption[]>([]);
  const [pelajaranOptions, setPelajaranOptions] = useState<Pelajaran[]>([]);
  const [rombelOptions, setRombelOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Group | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [formGtkId, setFormGtkId] = useState("");
  const [formMapelId, setFormMapelId] = useState<number | "">("");
  const [formRombelSet, setFormRombelSet] = useState<Set<string>>(new Set());

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const [listRes, gtkRes, pelajaranRes, rombelRes] = await Promise.all([
      supabase.from("guru_mengajar_kelas").select("*").order("created_at", { ascending: true }),
      supabase
        .from("datagtk")
        .select("id, nama, nip")
        .eq("jenis_ptk", "Guru")
        .order("nama", { ascending: true }),
      supabase.from("pelajaran").select("*").order("mapel", { ascending: true }),
      supabase.from("siswa01").select("rombel").not("rombel", "is", null),
    ]);

    if (listRes.error) {
      setError(listRes.error.message);
      setLoading(false);
      return;
    }

    setList(listRes.data ?? []);
    setGtkOptions(gtkRes.data ?? []);
    setPelajaranOptions(pelajaranRes.data ?? []);
    setRombelOptions(
      Array.from(new Set((rombelRes.data ?? []).map((r) => r.rombel).filter(Boolean) as string[])).sort(
        compareKelas
      )
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const gtkMap = new Map(gtkOptions.map((g) => [g.id, g]));
  const pelajaranMap = new Map(pelajaranOptions.map((p) => [p.id, p]));

  // Konsolidasi: 1 baris per (guru, mapel), rombel ditumpuk jadi satu daftar
  const groups: Group[] = (() => {
    const map = new Map<string, Group>();
    for (const item of list) {
      const key = `${item.gtk_id}|||${item.mapel_id}`;
      if (!map.has(key)) {
        map.set(key, { key, gtk_id: item.gtk_id, mapel_id: item.mapel_id, rombelList: [], ids: [] });
      }
      const g = map.get(key)!;
      g.rombelList.push(item.rombel);
      if (item.id) g.ids.push(item.id);
    }
    for (const g of map.values()) g.rombelList.sort(compareKelas);
    return Array.from(map.values()).sort((a, b) =>
      (gtkMap.get(a.gtk_id)?.nama || "").localeCompare(gtkMap.get(b.gtk_id)?.nama || "")
    );
  })();

  function openAdd() {
    setEditingGroup(null);
    setFormGtkId(gtkOptions[0]?.id ?? "");
    setFormMapelId(pelajaranOptions[0]?.id ?? "");
    setFormRombelSet(new Set());
    setActionError(null);
    setShowForm(true);
  }

  function openEdit(group: Group) {
    setEditingGroup(group);
    setFormGtkId(group.gtk_id);
    setFormMapelId(group.mapel_id);
    setFormRombelSet(new Set(group.rombelList));
    setActionError(null);
    setShowForm(true);
  }

  function toggleRombel(rombel: string) {
    setFormRombelSet((prev) => {
      const next = new Set(prev);
      if (next.has(rombel)) next.delete(rombel);
      else next.add(rombel);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formMapelId || formRombelSet.size === 0) {
      setActionError("Pilih guru, mapel, dan minimal 1 rombel.");
      return;
    }

    setSaving(true);
    setActionError(null);
    const supabase = createClient();

    if (editingGroup) {
      // Diff: rombel yang baru dicentang -> insert; yang di-uncentang -> hapus
      const rombelLama = new Set(editingGroup.rombelList);
      const toAdd = [...formRombelSet].filter((r) => !rombelLama.has(r));
      const toRemove = editingGroup.rombelList.filter((r) => !formRombelSet.has(r));

      if (toAdd.length > 0) {
        const { error } = await supabase
          .from("guru_mengajar_kelas")
          .insert(toAdd.map((rombel) => ({ gtk_id: formGtkId, mapel_id: formMapelId, rombel })));
        if (error) {
          setSaving(false);
          setActionError(error.message);
          return;
        }
      }
      if (toRemove.length > 0) {
        const { error } = await supabase
          .from("guru_mengajar_kelas")
          .delete()
          .eq("gtk_id", formGtkId)
          .eq("mapel_id", formMapelId)
          .in("rombel", toRemove);
        if (error) {
          setSaving(false);
          setActionError(error.message);
          return;
        }
      }
    } else {
      const payload = [...formRombelSet].map((rombel) => ({
        gtk_id: formGtkId,
        mapel_id: formMapelId,
        rombel,
      }));
      const { error } = await supabase.from("guru_mengajar_kelas").upsert(payload, {
        onConflict: "gtk_id,mapel_id,rombel",
      });
      if (error) {
        setSaving(false);
        setActionError(error.message);
        return;
      }
    }

    setSaving(false);
    setShowForm(false);
    fetchAll();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("guru_mengajar_kelas")
      .delete()
      .in("id", deleteTarget.ids);
    setSaving(false);
    if (!error) {
      setDeleteTarget(null);
      fetchAll();
    } else {
      setActionError(error.message);
    }
  }

  return (
    <div className="p-6 md:p-8 dark:bg-slate-900 min-h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Penugasan Mengajar Kelas</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Tentukan guru mana mengajar mapel apa di rombel mana (dasar untuk fitur Input Nilai)
          </p>
        </div>
        <button
          onClick={openAdd}
          disabled={gtkOptions.length === 0 || rombelOptions.length === 0 || pelajaranOptions.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white text-sm font-medium px-4 py-2.5 hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Tambah
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
              <th className="px-4 py-3 font-medium">Guru</th>
              <th className="px-4 py-3 font-medium">Mapel</th>
              <th className="px-4 py-3 font-medium">Rombel</th>
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
            ) : groups.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500">
                  Belum ada penugasan.
                </td>
              </tr>
            ) : (
              groups.map((group, idx) => (
                <tr key={group.key} className="border-b border-slate-100 dark:border-slate-700/60 last:border-0 hover:bg-slate-50/60 dark:hover:bg-slate-700/60">
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{idx + 1}</td>
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                    {gtkMap.get(group.gtk_id)?.nama || "-"}
                  </td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                    {pelajaranMap.get(group.mapel_id)?.mapel || "-"}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    <div className="flex flex-wrap gap-1">
                      {group.rombelList.map((r) => (
                        <span
                          key={r}
                          className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-700 px-2 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-300"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(group)}
                        className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(group)}
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
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-5xl w-full shadow-xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                {editingGroup ? "Edit Penugasan" : "Tambah Penugasan"}
              </h3>
              <button onClick={() => setShowForm(false)}>
                <X className="h-4 w-4 text-slate-400 dark:text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="grid sm:grid-cols-3 gap-5 mb-5">
                {/* Guru: radio, pilih satu */}
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">Guru</p>
                  <div className="border border-slate-200 dark:border-slate-700 rounded-lg max-h-[28rem] overflow-y-auto">
                    {gtkOptions.map((g) => (
                      <label
                        key={g.id}
                        className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer border-b border-slate-100 dark:border-slate-700/60 last:border-0 ${
                          editingGroup ? "opacity-50 cursor-not-allowed" : "hover:bg-slate-50 dark:hover:bg-slate-700"
                        }`}
                      >
                        <input
                          type="radio"
                          name="guru"
                          checked={formGtkId === g.id}
                          disabled={Boolean(editingGroup)}
                          onChange={() => setFormGtkId(g.id)}
                          className="accent-indigo-600"
                        />
                        {g.nama}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Mapel: radio, pilih satu */}
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">Mapel</p>
                  <div className="border border-slate-200 dark:border-slate-700 rounded-lg max-h-[28rem] overflow-y-auto">
                    {pelajaranOptions.map((p) => (
                      <label
                        key={p.id}
                        className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer border-b border-slate-100 dark:border-slate-700/60 last:border-0 ${
                          editingGroup ? "opacity-50 cursor-not-allowed" : "hover:bg-slate-50 dark:hover:bg-slate-700"
                        }`}
                      >
                        <input
                          type="radio"
                          name="mapel"
                          checked={formMapelId === p.id}
                          disabled={Boolean(editingGroup)}
                          onChange={() => setFormMapelId(p.id)}
                          className="accent-indigo-600"
                        />
                        {p.mapel}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Rombel: checklist, bisa banyak */}
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">Rombel</p>
                  <div className="border border-slate-200 dark:border-slate-700 rounded-lg max-h-[28rem] overflow-y-auto">
                    {rombelOptions.map((r) => (
                      <label
                        key={r}
                        className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-700/60 last:border-0"
                      >
                        <input
                          type="checkbox"
                          checked={formRombelSet.has(r)}
                          onChange={() => toggleRombel(r)}
                          className="accent-indigo-600"
                        />
                        {r}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {editingGroup && (
                <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">
                  Guru & mapel tidak bisa diubah di sini — hapus penugasan ini dan buat baru kalau
                  perlu ganti guru/mapel. Anda bisa menambah/menghapus rombel dengan centang di atas.
                </p>
              )}

              {actionError && (
                <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg px-3 py-2 mb-4">
                  {actionError}
                </p>
              )}

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

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1.5">Hapus penugasan ini?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
              {gtkMap.get(deleteTarget.gtk_id)?.nama} akan berhenti mengajar{" "}
              <span className="font-medium text-slate-700 dark:text-slate-200">
                {pelajaranMap.get(deleteTarget.mapel_id)?.mapel}
              </span>{" "}
              di semua rombel ({deleteTarget.rombelList.join(", ")}).
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
