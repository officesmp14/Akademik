"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MODULES, ModuleKey } from "@/lib/module-catalog";
import { Loader2, X } from "lucide-react";

type ApiUser = {
  id: string;
  email: string | null;
  gtk_nama: string | null;
  gtk_nip: string | null;
};

type ModuleRowState = {
  enabled: boolean;
  view: boolean;
  edit: boolean;
  delete: boolean;
};

function initialModuleState(): Record<ModuleKey, ModuleRowState> {
  return Object.fromEntries(
    MODULES.map((m) => [m.key, { enabled: false, view: false, edit: false, delete: false }])
  ) as Record<ModuleKey, ModuleRowState>;
}

export default function BulkAccessForm({
  users,
  onClose,
  onSaved,
}: {
  users: ApiUser[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [moduleState, setModuleState] = useState<Record<ModuleKey, ModuleRowState>>(
    initialModuleState()
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleUser(id: string) {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleModuleEnabled(key: ModuleKey) {
    setModuleState((prev) => {
      const current = prev[key];
      const enabling = !current.enabled;
      return {
        ...prev,
        [key]: enabling
          ? { enabled: true, view: true, edit: false, delete: false } // default centang Lihat saat modul diaktifkan
          : { enabled: false, view: false, edit: false, delete: false },
      };
    });
  }

  function toggleAction(key: ModuleKey, action: "view" | "edit" | "delete") {
    setModuleState((prev) => ({
      ...prev,
      [key]: { ...prev[key], [action]: !prev[key][action] },
    }));
  }

  async function handleSave() {
    setError(null);

    const activeModules = MODULES.filter((m) => moduleState[m.key].enabled);

    if (selectedUserIds.size === 0) {
      setError("Pilih minimal 1 user.");
      return;
    }
    if (activeModules.length === 0) {
      setError("Pilih minimal 1 modul.");
      return;
    }

    setSaving(true);
    const supabase = createClient();

    const payloads = [];
    for (const userId of selectedUserIds) {
      for (const m of activeModules) {
        const s = moduleState[m.key];
        payloads.push({
          user_id: userId,
          module: m.key,
          can_view: s.view,
          can_edit: s.edit,
          can_delete: s.delete,
        });
      }
    }

    const { error } = await supabase
      .from("user_module_access")
      .upsert(payloads, { onConflict: "user_id,module" });

    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-4xl w-full shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">Tambah Hak Akses</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Centang user di kiri, atur modul & aksi di kanan, lalu simpan sekaligus.
            </p>
          </div>
          <button onClick={onClose}>
            <X className="h-4 w-4 text-slate-400 dark:text-slate-500" />
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {/* Tabel kiri: pilih user */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700/40 text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                  <th className="px-3 py-2 font-medium w-10 text-center">✓</th>
                  <th className="px-3 py-2 font-medium w-10">No</th>
                  <th className="px-3 py-2 font-medium">Nama User</th>
                  <th className="px-3 py-2 font-medium">Nama</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, idx) => (
                  <tr
                    key={u.id}
                    onClick={() => toggleUser(u.id)}
                    className="border-b border-slate-100 dark:border-slate-700/60 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={selectedUserIds.has(u.id)}
                        onChange={() => toggleUser(u.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="accent-indigo-600"
                      />
                    </td>
                    <td className="px-3 py-2 text-slate-500 dark:text-slate-400">{idx + 1}</td>
                    <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{u.email}</td>
                    <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{u.gtk_nama || "-"}</td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-slate-400 dark:text-slate-500">
                      Belum ada user.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Tabel kanan: pilih modul & aksi */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700/40 text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                  <th className="px-3 py-2 font-medium w-10 text-center">✓</th>
                  <th className="px-3 py-2 font-medium w-10">No</th>
                  <th className="px-3 py-2 font-medium">Modul</th>
                  <th className="px-3 py-2 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {MODULES.map((m, idx) => {
                  const s = moduleState[m.key];
                  return (
                    <tr key={m.key} className="border-b border-slate-100 dark:border-slate-700/60 last:border-0">
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={s.enabled}
                          onChange={() => toggleModuleEnabled(m.key)}
                          className="accent-indigo-600"
                        />
                      </td>
                      <td className="px-3 py-2 text-slate-500 dark:text-slate-400">{idx + 1}</td>
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{m.label}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-x-3 gap-y-1">
                          <label
                            className={`flex items-center gap-1 text-xs ${
                              s.enabled ? "text-slate-700 dark:text-slate-200" : "text-slate-300"
                            }`}
                          >
                            <input
                              type="checkbox"
                              disabled={!s.enabled}
                              checked={s.view}
                              onChange={() => toggleAction(m.key, "view")}
                              className="accent-indigo-600"
                            />
                            Lihat
                          </label>
                          <label
                            className={`flex items-center gap-1 text-xs ${
                              s.enabled ? "text-slate-700 dark:text-slate-200" : "text-slate-300"
                            }`}
                          >
                            <input
                              type="checkbox"
                              disabled={!s.enabled}
                              checked={s.edit}
                              onChange={() => toggleAction(m.key, "edit")}
                              className="accent-indigo-600"
                            />
                            Edit
                          </label>
                          <label
                            className={`flex items-center gap-1 text-xs ${
                              s.enabled ? "text-slate-700 dark:text-slate-200" : "text-slate-300"
                            }`}
                          >
                            <input
                              type="checkbox"
                              disabled={!s.enabled}
                              checked={s.delete}
                              onChange={() => toggleAction(m.key, "delete")}
                              className="accent-indigo-600"
                            />
                            Hapus
                          </label>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg px-3 py-2 mt-4">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white text-sm font-medium px-4 py-2 hover:bg-indigo-700 disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
}
