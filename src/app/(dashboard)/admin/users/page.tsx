"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getPageNumbers } from "@/lib/pagination";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  X,
  ShieldBan,
  ShieldCheck,
  KeyRound,
  Search,
} from "lucide-react";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

type ManagedUser = {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  banned_until: string | null;
  role: string | null;
  gtk_id: string | null;
  gtk_nama: string | null;
  gtk_nip: string | null;
};

type GtkOption = { id: string; nama: string | null; nip: string | null };

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "kepala_sekolah", label: "Kepala Sekolah" },
  { value: "guru", label: "Guru" },
  { value: "staf_tu", label: "Staf Tata Usaha" },
];

const ROLE_LABEL: Record<string, string> = Object.fromEntries(
  ROLE_OPTIONS.map((r) => [r.value, r.label])
);

function isBanned(u: ManagedUser) {
  if (!u.banned_until) return false;
  return new Date(u.banned_until).getTime() > Date.now();
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [search, setSearch] = useState("");
  const [gtkOptions, setGtkOptions] = useState<GtkOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ManagedUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ManagedUser | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkSaving, setBulkSaving] = useState(false);

  // Form state
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState("guru");
  const [formGtkId, setFormGtkId] = useState("");

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users");
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Gagal memuat daftar user");
        return;
      }
      setUsers(json.users);
    } catch {
      setError("Gagal memuat daftar user");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUsers();
    async function fetchGtkOptions() {
      const supabase = createClient();
      const { data } = await supabase
        .from("datagtk")
        .select("id, nama, nip")
        .order("nama", { ascending: true });
      setGtkOptions(data ?? []);
    }
    fetchGtkOptions();
  }, [fetchUsers]);

  function openAdd() {
    setEditing(null);
    setFormEmail("");
    setFormPassword("");
    setFormRole("guru");
    setFormGtkId("");
    setActionError(null);
    setShowForm(true);
  }

  function openEdit(u: ManagedUser) {
    setEditing(u);
    setFormEmail(u.email ?? "");
    setFormPassword("");
    setFormRole(u.role ?? "guru");
    setFormGtkId(u.gtk_id ?? "");
    setActionError(null);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setActionError(null);

    try {
      if (editing) {
        const res = await fetch(`/api/admin/users/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role: formRole,
            gtk_id: formGtkId || null,
            ...(formPassword ? { password: formPassword } : {}),
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          setActionError(json.error ?? "Gagal menyimpan perubahan");
          setSaving(false);
          return;
        }
      } else {
        const res = await fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: formEmail,
            password: formPassword,
            role: formRole,
            gtk_id: formGtkId || null,
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          setActionError(json.error ?? "Gagal membuat user");
          setSaving(false);
          return;
        }
      }

      setSaving(false);
      setShowForm(false);
      fetchUsers();
    } catch {
      setActionError("Terjadi kesalahan tak terduga");
      setSaving(false);
    }
  }

  async function toggleBan(u: ManagedUser) {
    const banned = !isBanned(u);
    const res = await fetch(`/api/admin/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ banned }),
    });
    if (res.ok) fetchUsers();
  }

  function toggleSelectOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllOnPage() {
    const idsOnPage = paginatedUsers.map((u) => u.id);
    const allSelected = idsOnPage.length > 0 && idsOnPage.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        idsOnPage.forEach((id) => next.delete(id));
      } else {
        idsOnPage.forEach((id) => next.add(id));
      }
      return next;
    });
  }

  async function handleBulkSetBanned(banned: boolean) {
    if (selected.size === 0) return;
    setBulkSaving(true);
    setActionError(null);

    const results = await Promise.all(
      [...selected].map((id) =>
        fetch(`/api/admin/users/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ banned }),
        })
      )
    );

    setBulkSaving(false);

    if (results.some((r) => !r.ok)) {
      setActionError("Sebagian user gagal diperbarui. Coba lagi.");
    }

    setSelected(new Set());
    fetchUsers();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setSaving(true);
    const res = await fetch(`/api/admin/users/${deleteTarget.id}`, { method: "DELETE" });
    setSaving(false);
    if (res.ok) {
      setDeleteTarget(null);
      fetchUsers();
    } else {
      const json = await res.json();
      setActionError(json.error ?? "Gagal menghapus user");
    }
  }

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      (u.email ?? "").toLowerCase().includes(q) ||
      (u.gtk_nama ?? "").toLowerCase().includes(q) ||
      (u.gtk_nip ?? "").toLowerCase().includes(q)
    );
  });
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const paginatedUsers = filteredUsers.slice(page * pageSize, page * pageSize + pageSize);
  const allOnPageSelected =
    paginatedUsers.length > 0 && paginatedUsers.every((u) => selected.has(u.id));

  return (
    <div className="p-6 md:p-8 dark:bg-slate-900 min-h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Kelola User</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Atur akun login & peran (role) untuk admin, guru, kepala sekolah, dan staf TU
          </p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white text-sm font-medium px-4 py-2.5 hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Tambah User
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg px-3 py-2 mb-4">
          {error}
        </p>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <select
          value={pageSize}
          onChange={(e) => {
            setPageSize(Number(e.target.value));
            setPage(0);
          }}
          className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          {PAGE_SIZE_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n} / halaman
            </option>
          ))}
        </select>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Cari email, nama guru, atau NIP..."
            className="w-full sm:w-72 rounded-lg border border-slate-300 dark:border-slate-600 pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        {selected.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500 dark:text-slate-400">{selected.size} dipilih</span>
            <button
              onClick={() => handleBulkSetBanned(false)}
              disabled={bulkSaving}
              className="inline-flex items-center gap-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
            >
              {bulkSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Aktifkan
            </button>
            <button
              onClick={() => handleBulkSetBanned(true)}
              disabled={bulkSaving}
              className="inline-flex items-center gap-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
            >
              {bulkSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <ShieldBan className="h-4 w-4 text-red-600 dark:text-red-400" />
              Nonaktifkan
            </button>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40 text-left text-slate-500 dark:text-slate-400">
                <th className="px-4 py-3 font-medium w-10">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={toggleSelectAllOnPage}
                    className="accent-indigo-600"
                    title="Pilih semua di halaman ini"
                  />
                </th>
                <th className="px-4 py-3 font-medium w-12">No</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Terhubung ke GTK</th>
                <th className="px-4 py-3 font-medium">Terakhir Login</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500">
                    {users.length === 0 ? "Belum ada user." : "Tidak ada user yang cocok."}
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((u, idx) => (
                  <tr key={u.id} className="border-b border-slate-100 dark:border-slate-700/60 last:border-0 hover:bg-slate-50/60 dark:hover:bg-slate-700">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(u.id)}
                        onChange={() => toggleSelectOne(u.id)}
                        className="accent-indigo-600"
                      />
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{page * pageSize + idx + 1}</td>
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-700 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-300 capitalize">
                        {u.role ? ROLE_LABEL[u.role] ?? u.role : "Belum diatur"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{u.gtk_nama || "-"}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">
                      {u.last_sign_in_at
                        ? new Date(u.last_sign_in_at).toLocaleString("id-ID")
                        : "Belum pernah login"}
                    </td>
                    <td className="px-4 py-3">
                      {isBanned(u) ? (
                        <span className="inline-flex items-center rounded-full bg-red-50 dark:bg-red-500/10 px-2.5 py-0.5 text-xs font-medium text-red-600 dark:text-red-400">
                          Nonaktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          Aktif
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(u)}
                          title="Edit"
                          className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => toggleBan(u)}
                          title={isBanned(u) ? "Aktifkan" : "Nonaktifkan"}
                          className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400"
                        >
                          {isBanned(u) ? (
                            <ShieldCheck className="h-4 w-4" />
                          ) : (
                            <ShieldBan className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => setDeleteTarget(u)}
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

        {!loading && filteredUsers.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Halaman {page + 1} dari {totalPages}
              {" "}&middot;{" "}{filteredUsers.length} user
            </p>
            <nav className="flex items-center gap-1 text-sm">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-2 py-1 font-medium tracking-wide text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-40 disabled:hover:text-slate-500 dark:disabled:hover:text-slate-400"
              >
                PREVIOUS
              </button>

              {getPageNumbers(page + 1, totalPages).map((p, i) =>
                p === "..." ? (
                  <span key={`ellipsis-${i}`} className="px-1.5 text-slate-400 dark:text-slate-500 select-none">
                    ...
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p - 1)}
                    className={`h-7 w-7 rounded-full text-sm font-medium transition-colors ${
                      p === page + 1 ? "bg-indigo-600 text-white" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                    }`}
                  >
                    {p}
                  </button>
                )
              )}

              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-2 py-1 font-medium tracking-wide text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-40 disabled:hover:text-slate-500 dark:disabled:hover:text-slate-400"
              >
                NEXT
              </button>
            </nav>
          </div>
        )}
      </div>

      {/* Modal tambah/edit user */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                {editing ? "Edit User" : "Tambah User Baru"}
              </h3>
              <button onClick={() => setShowForm(false)}>
                <X className="h-4 w-4 text-slate-400 dark:text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">Email</label>
                <input
                  type="email"
                  required
                  disabled={Boolean(editing)}
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm disabled:bg-slate-50 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                  {editing ? "Ganti Password (kosongkan jika tidak diubah)" : "Password"}
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                  <input
                    type="text"
                    required={!editing}
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder={editing ? "••••••••" : "Minimal 6 karakter"}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">Role</label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              {(formRole === "guru" || formRole === "staf_tu") && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                    Terhubung ke Data GTK
                  </label>
                  <select
                    value={formGtkId}
                    onChange={(e) => setFormGtkId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Pilih guru/tendik --</option>
                    {gtkOptions.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.nama} {g.nip ? `(NIP: ${g.nip})` : ""}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    Supaya user ini otomatis lihat/edit profil GTK yang sesuai.
                  </p>
                </div>
              )}

              {actionError && (
                <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg px-3 py-2">
                  {actionError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
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
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1.5">Hapus user ini?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
              Akun <span className="font-medium text-slate-700 dark:text-slate-200">{deleteTarget.email}</span> akan
              dihapus permanen dan tidak bisa login lagi.
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
