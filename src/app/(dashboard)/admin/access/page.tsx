"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MODULES, MODULE_LABEL, ModuleKey } from "@/lib/module-catalog";
import BulkAccessForm from "@/components/BulkAccessForm";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  PenLine,
  Ban,
} from "lucide-react";

const PAGE_SIZE = 10;

type ApiUser = {
  id: string;
  email: string | null;
  gtk_nama: string | null;
  gtk_nip: string | null;
};

type AccessRow = {
  id: string;
  user_id: string;
  module: string;
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
};

type UserGroup = {
  userId: string;
  nama: string | null;
  email: string | null;
  entries: AccessRow[];
};

export default function HakAksesPage() {
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [accessList, setAccessList] = useState<AccessRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const [showForm, setShowForm] = useState(false);
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [editing, setEditing] = useState<AccessRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<(AccessRow & { nama: string | null; email: string | null }) | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [formUserId, setFormUserId] = useState("");
  const [formModule, setFormModule] = useState<ModuleKey>("siswa");
  const [formCanView, setFormCanView] = useState(true);
  const [formCanEdit, setFormCanEdit] = useState(false);
  const [formCanDelete, setFormCanDelete] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, supabase] = await Promise.all([
        fetch("/api/admin/users").then((r) => r.json()),
        Promise.resolve(createClient()),
      ]);

      if (usersRes.error) {
        setError(usersRes.error);
        setLoading(false);
        return;
      }
      setUsers(usersRes.users);

      const { data, error: accessError } = await supabase
        .from("user_module_access")
        .select("*")
        .order("created_at", { ascending: true });

      if (accessError) {
        setError(accessError.message);
        setLoading(false);
        return;
      }
      setAccessList(data ?? []);
    } catch {
      setError("Gagal memuat data hak akses");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const userMap = new Map(users.map((u) => [u.id, u]));

  const groupsMap = new Map<string, UserGroup>();
  for (const a of accessList) {
    if (!groupsMap.has(a.user_id)) {
      const u = userMap.get(a.user_id);
      groupsMap.set(a.user_id, {
        userId: a.user_id,
        nama: u?.gtk_nama ?? null,
        email: u?.email ?? null,
        entries: [],
      });
    }
    groupsMap.get(a.user_id)!.entries.push(a);
  }

  const userGroups = Array.from(groupsMap.values()).sort((a, b) =>
    (a.nama || a.email || "").localeCompare(b.nama || b.email || "", "id")
  );

  const totalPages = Math.max(1, Math.ceil(userGroups.length / PAGE_SIZE));
  const pagedGroups = userGroups.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  function openAdd() {
    setActionError(null);
    setShowBulkForm(true);
  }

  function openEdit(row: AccessRow) {
    setEditing(row);
    setFormUserId(row.user_id);
    setFormModule(row.module as ModuleKey);
    setFormCanView(row.can_view);
    setFormCanEdit(row.can_edit);
    setFormCanDelete(row.can_delete);
    setActionError(null);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setActionError(null);
    const supabase = createClient();

    const payload = {
      user_id: formUserId,
      module: formModule,
      can_view: formCanView,
      can_edit: formCanEdit,
      can_delete: formCanDelete,
    };

    const { error } = editing
      ? await supabase.from("user_module_access").update(payload).eq("id", editing.id)
      : await supabase.from("user_module_access").upsert(payload, { onConflict: "user_id,module" });

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
    const { error } = await supabase
      .from("user_module_access")
      .delete()
      .eq("id", deleteTarget.id);
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Hak Akses</h1>
          <p className="text-sm text-slate-500 mt-1">
            Atur modul apa saja yang boleh diakses tiap user, beserta aksi yang diizinkan
          </p>
        </div>
        <button
          onClick={openAdd}
          disabled={users.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white text-sm font-medium px-4 py-2.5 hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Tambah Akses
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">
          {error}
        </p>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
                <th className="px-4 py-3 font-medium w-12">No</th>
                <th className="px-4 py-3 font-medium">Nama</th>
                <th className="px-4 py-3 font-medium">Email Login</th>
                <th className="px-4 py-3 font-medium">Modul Akses</th>
                <th className="px-4 py-3 font-medium">Aksi</th>
                <th className="px-4 py-3 font-medium text-right">Kelola</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : pagedGroups.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                    Belum ada hak akses yang diatur.
                  </td>
                </tr>
              ) : (
                pagedGroups.map((group, idx) => (
                  <tr key={group.userId} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60 align-top">
                    <td className="px-4 py-3 text-slate-500">{page * PAGE_SIZE + idx + 1}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{group.nama || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{group.email || "-"}</td>
                    <td className="px-4 py-3 text-slate-700">
                      <div className="space-y-2">
                        {group.entries.map((entry) => (
                          <div key={entry.id} className="h-6 flex items-center">
                            {MODULE_LABEL[entry.module] ?? entry.module}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-2">
                        {group.entries.map((entry) => (
                          <div key={entry.id} className="h-6 flex items-center gap-1.5">
                            {entry.can_view && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">
                                <Eye className="h-3 w-3" /> Lihat
                              </span>
                            )}
                            {entry.can_edit && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600">
                                <PenLine className="h-3 w-3" /> Edit
                              </span>
                            )}
                            {entry.can_delete && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
                                <Trash2 className="h-3 w-3" /> Hapus
                              </span>
                            )}
                            {!entry.can_view && !entry.can_edit && !entry.can_delete && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                                <Ban className="h-3 w-3" /> Tidak ada
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-2">
                        {group.entries.map((entry) => (
                          <div key={entry.id} className="h-6 flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEdit(entry)}
                              title="Edit"
                              className="p-1.5 rounded-lg text-slate-500 hover:bg-indigo-50 hover:text-indigo-600"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() =>
                                setDeleteTarget({ ...entry, nama: group.nama, email: group.email })
                              }
                              title="Hapus"
                              className="p-1.5 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && userGroups.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
            <p className="text-xs text-slate-500">
              Halaman {page + 1} dari {totalPages} &middot; {userGroups.length} user
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Form tambah massal (checklist user x modul) */}
      {showBulkForm && (
        <BulkAccessForm
          users={users}
          onClose={() => setShowBulkForm(false)}
          onSaved={() => {
            setShowBulkForm(false);
            fetchAll();
          }}
        />
      )}

      {/* Modal edit satuan */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">
                {editing ? "Edit Hak Akses" : "Tambah Hak Akses"}
              </h3>
              <button onClick={() => setShowForm(false)}>
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">User</label>
                <select
                  value={formUserId}
                  onChange={(e) => setFormUserId(e.target.value)}
                  disabled={Boolean(editing)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white disabled:bg-slate-50 disabled:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.gtk_nama ? `${u.gtk_nama} (${u.email})` : u.email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Modul</label>
                <select
                  value={formModule}
                  onChange={(e) => setFormModule(e.target.value as ModuleKey)}
                  disabled={Boolean(editing)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white disabled:bg-slate-50 disabled:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {MODULES.map((m) => (
                    <option key={m.key} value={m.key}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">Aksi yang diizinkan</p>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formCanView}
                      onChange={(e) => setFormCanView(e.target.checked)}
                      className="accent-indigo-600"
                    />
                    Lihat
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formCanEdit}
                      onChange={(e) => setFormCanEdit(e.target.checked)}
                      className="accent-indigo-600"
                    />
                    Edit
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formCanDelete}
                      onChange={(e) => setFormCanDelete(e.target.checked)}
                      className="accent-indigo-600"
                    />
                    Hapus
                  </label>
                </div>
              </div>

              {actionError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {actionError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
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

      {/* Konfirmasi hapus */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-semibold text-slate-900 mb-1.5">Hapus hak akses ini?</h3>
            <p className="text-sm text-slate-500 mb-5">
              Akses ke modul{" "}
              <span className="font-medium text-slate-700">
                {MODULE_LABEL[deleteTarget.module] ?? deleteTarget.module}
              </span>{" "}
              untuk <span className="font-medium text-slate-700">{deleteTarget.nama || deleteTarget.email}</span>{" "}
              akan dihapus.
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
