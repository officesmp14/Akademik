"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRole } from "@/lib/role-context";
import { compareKelas } from "@/lib/rekap-siswa";
import { JAM_KE_OPTIONS } from "@/types/presensi";
import {
  JadwalSupervisi,
  STATUS_SUPERVISI_COLOR,
  STATUS_SUPERVISI_OPTIONS,
  StatusSupervisi,
} from "@/types/supervisi";
import { Pencil, Trash2, Loader2, X, Plus, CalendarCheck2, Calendar, ExternalLink } from "lucide-react";

type GtkOption = { id: string; nama: string | null; nip: string | null };

type FormState = {
  gtk_id: string;
  tanggal: string;
  rombel: string;
  jam_ke: number;
  status: StatusSupervisi;
  tahun: number;
  deskripsi_pokok_bahasan: string;
  link_dokumen: string;
};

function emptyForm(defaultGtkId = "", tahun = new Date().getFullYear()): FormState {
  return {
    gtk_id: defaultGtkId,
    tanggal: "",
    rombel: "",
    jam_ke: 1,
    status: "Direncanakan",
    tahun,
    deskripsi_pokok_bahasan: "",
    link_dokumen: "",
  };
}

function formatTanggal(tanggal: string) {
  return new Date(`${tanggal}T00:00:00`).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function JadwalSupervisiPage() {
  const { role, gtkId, gtkNama } = useRole();
  const isFullAccessRole = role === "admin" || role === "kepala_sekolah";
  const canCreate = isFullAccessRole || role === "guru";

  const [jadwalList, setJadwalList] = useState<JadwalSupervisi[]>([]);
  const [gtkOptions, setGtkOptions] = useState<GtkOption[]>([]);
  const [gtkNamaOptions, setGtkNamaOptions] = useState<{ id: string; nama: string | null }[]>([]);
  const [rombelOptions, setRombelOptions] = useState<string[]>([]);
  const [tahunFilter, setTahunFilter] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<FormState>(emptyForm());

  const [editTarget, setEditTarget] = useState<JadwalSupervisi | null>(null);
  const [editForm, setEditForm] = useState<FormState>(emptyForm());

  const [deleteTarget, setDeleteTarget] = useState<JadwalSupervisi | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!tahunFilter) return;
    setLoading(true);
    setError(null);
    const supabase = createClient();

    // gtkNamaOptions (view aman, cuma id+nama) dipakai untuk MENAMPILKAN nama
    // guru di tabel -- supaya semua role bisa lihat nama guru lain tanpa kena
    // batasan RLS datagtk. gtkOptions (dari datagtk asli, ada NIP) cuma
    // dipakai di form Tambah/Ubah yang hanya dibuka admin/kepsek.
    const [jadwalRes, gtkRes, gtkNamaRes, rombelRes] = await Promise.all([
      supabase
        .from("jadwal_supervisi")
        .select("id, gtk_id, tanggal, rombel, jam_ke, status, tahun, deskripsi_pokok_bahasan, link_dokumen")
        .eq("tahun", tahunFilter)
        .order("tanggal", { ascending: false }),
      supabase
        .from("datagtk")
        .select("id, nama, nip")
        .eq("jenis_ptk", "Guru")
        .eq("status_aktif", "Y")
        .order("nama", { ascending: true }),
      supabase.from("gtk_nama_publik").select("id, nama").order("nama", { ascending: true }),
      supabase.from("siswa01").select("rombel").eq("status_siswa", "Aktif").not("rombel", "is", null),
    ]);

    if (jadwalRes.error) {
      setError(jadwalRes.error.message);
      setLoading(false);
      return;
    }

    setJadwalList(jadwalRes.data ?? []);
    setGtkOptions(gtkRes.data ?? []);
    setGtkNamaOptions(gtkNamaRes.data ?? []);
    const uniqueRombel = Array.from(
      new Set((rombelRes.data ?? []).map((r) => r.rombel).filter(Boolean) as string[])
    ).sort(compareKelas);
    setRombelOptions(uniqueRombel);
    setLoading(false);
  }, [tahunFilter]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const gtkMap = useMemo(() => new Map(gtkNamaOptions.map((g) => [g.id, g])), [gtkNamaOptions]);

  function canManageRow(row: JadwalSupervisi) {
    return isFullAccessRole || row.gtk_id === gtkId;
  }

  function openAdd() {
    setAddForm(emptyForm(isFullAccessRole ? "" : gtkId ?? "", tahunFilter));
    setActionError(null);
    setShowAddForm(true);
  }

  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!addForm.gtk_id || !addForm.tanggal || !addForm.rombel || !addForm.tahun) {
      setActionError("Lengkapi guru, tanggal, kelas, dan tahun terlebih dahulu.");
      return;
    }

    setSaving(true);
    setActionError(null);
    const supabase = createClient();

    const { error } = await supabase.from("jadwal_supervisi").insert({
      gtk_id: addForm.gtk_id,
      tanggal: addForm.tanggal,
      rombel: addForm.rombel,
      jam_ke: addForm.jam_ke,
      status: addForm.status,
      tahun: addForm.tahun,
      deskripsi_pokok_bahasan: addForm.deskripsi_pokok_bahasan.trim() || null,
      link_dokumen: addForm.link_dokumen.trim() || null,
    });

    setSaving(false);

    if (error) {
      setActionError(error.message);
      return;
    }

    setShowAddForm(false);
    fetchAll();
  }

  function openEdit(row: JadwalSupervisi) {
    setEditTarget(row);
    setEditForm({
      gtk_id: row.gtk_id,
      tanggal: row.tanggal,
      rombel: row.rombel,
      jam_ke: row.jam_ke,
      status: row.status,
      tahun: row.tahun,
      deskripsi_pokok_bahasan: row.deskripsi_pokok_bahasan ?? "",
      link_dokumen: row.link_dokumen ?? "",
    });
    setActionError(null);
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget || !editForm.gtk_id || !editForm.tanggal || !editForm.rombel || !editForm.tahun) return;

    setSaving(true);
    setActionError(null);
    const supabase = createClient();

    const { error } = await supabase
      .from("jadwal_supervisi")
      .update({
        gtk_id: editForm.gtk_id,
        tanggal: editForm.tanggal,
        rombel: editForm.rombel,
        jam_ke: editForm.jam_ke,
        status: editForm.status,
        tahun: editForm.tahun,
        deskripsi_pokok_bahasan: editForm.deskripsi_pokok_bahasan.trim() || null,
        link_dokumen: editForm.link_dokumen.trim() || null,
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
    const { error } = await supabase.from("jadwal_supervisi").delete().eq("id", deleteTarget.id);
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
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Jadwal Supervisi</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Jadwal supervisi proses mengajar guru di kelas
          </p>
        </div>
        {canCreate && (
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white text-sm font-medium px-4 py-2 hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            Tambah Jadwal
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <input
          type="number"
          value={tahunFilter}
          onChange={(e) => setTahunFilter(Number(e.target.value))}
          className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm w-28 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="2026"
        />
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
              <th className="px-4 py-3 font-medium">Nama Guru</th>
              <th className="px-4 py-3 font-medium">Tahun</th>
              <th className="px-4 py-3 font-medium">Tanggal</th>
              <th className="px-4 py-3 font-medium">Kelas</th>
              <th className="px-4 py-3 font-medium">Jam ke</th>
              <th className="px-4 py-3 font-medium">Status Proses</th>
              <th className="px-4 py-3 font-medium">Pokok Bahasan</th>
              <th className="px-4 py-3 font-medium">Dokumen</th>
              <th className="px-4 py-3 font-medium text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                </td>
              </tr>
            ) : jadwalList.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500">
                  <CalendarCheck2 className="h-6 w-6 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                  Belum ada jadwal supervisi.
                </td>
              </tr>
            ) : (
              jadwalList.map((row, idx) => {
                const gtk = gtkMap.get(row.gtk_id);
                const canManage = canManageRow(row);
                return (
                  <tr key={row.id} className="border-b border-slate-100 dark:border-slate-700/60 last:border-0 hover:bg-slate-50/60 dark:hover:bg-slate-700/40">
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{idx + 1}</td>
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                      {gtk ? gtk.nama : <span className="text-slate-400 dark:text-slate-500 font-normal">- Tidak diketahui -</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{row.tahun || "-"}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{formatTanggal(row.tanggal)}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{row.rombel}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{row.jam_ke}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_SUPERVISI_COLOR[row.status]}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200 max-w-xs truncate" title={row.deskripsi_pokok_bahasan ?? ""}>
                      {row.deskripsi_pokok_bahasan || "-"}
                    </td>
                    <td className="px-4 py-3">
                      {row.link_dokumen ? (
                        <a
                          href={row.link_dokumen}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={row.link_dokumen}
                          className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Lihat
                        </a>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {canManage && (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(row)}
                            title="Ubah"
                            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(row)}
                            title="Hapus"
                            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showAddForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-2xl w-full shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">Tambah Jadwal Supervisi</h3>
              <button onClick={() => setShowAddForm(false)}>
                <X className="h-4 w-4 text-slate-400 dark:text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">Nama Guru</label>
                {isFullAccessRole ? (
                  <select
                    value={addForm.gtk_id}
                    onChange={(e) => setAddForm((f) => ({ ...f, gtk_id: e.target.value }))}
                    required
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Pilih guru --</option>
                    {gtkOptions.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.nama} {g.nip ? `(NIP: ${g.nip})` : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={gtkNama ?? ""}
                    disabled
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-3 py-2 text-sm"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">Tanggal</label>
                  <div className="relative">
                    <input
                      id="jadwal-supervisi-add-tanggal"
                      type="date"
                      value={addForm.tanggal}
                      onChange={(e) => setAddForm((f) => ({ ...f, tanggal: e.target.value }))}
                      required
                      className="jadwal-date-input w-full rounded-lg border border-slate-300 dark:border-slate-600 pl-3 pr-10 py-2 text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() =>
                        (document.getElementById("jadwal-supervisi-add-tanggal") as HTMLInputElement | null)?.showPicker?.()
                      }
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400"
                    >
                      <Calendar className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">Tahun</label>
                  <input
                    type="number"
                    value={addForm.tahun}
                    onChange={(e) => setAddForm((f) => ({ ...f, tahun: Number(e.target.value) }))}
                    placeholder="2026"
                    required
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">Kelas</label>
                  <select
                    value={addForm.rombel}
                    onChange={(e) => setAddForm((f) => ({ ...f, rombel: e.target.value }))}
                    required
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Pilih --</option>
                    {rombelOptions.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">Jam ke</label>
                  <select
                    value={addForm.jam_ke}
                    onChange={(e) => setAddForm((f) => ({ ...f, jam_ke: Number(e.target.value) }))}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {JAM_KE_OPTIONS.map((j) => (
                      <option key={j} value={j}>
                        {j}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">Status Proses</label>
                  <select
                    value={addForm.status}
                    onChange={(e) => setAddForm((f) => ({ ...f, status: e.target.value as StatusSupervisi }))}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {STATUS_SUPERVISI_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                    Link Dokumen
                  </label>
                  <input
                    type="url"
                    value={addForm.link_dokumen}
                    onChange={(e) => setAddForm((f) => ({ ...f, link_dokumen: e.target.value }))}
                    placeholder="https://drive.google.com/..."
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                  Deskripsi Pokok Bahasan
                </label>
                <textarea
                  value={addForm.deskripsi_pokok_bahasan}
                  onChange={(e) => setAddForm((f) => ({ ...f, deskripsi_pokok_bahasan: e.target.value }))}
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

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
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-2xl w-full shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">Ubah Jadwal Supervisi</h3>
              <button onClick={() => setEditTarget(null)}>
                <X className="h-4 w-4 text-slate-400 dark:text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">Nama Guru</label>
                {isFullAccessRole ? (
                  <select
                    value={editForm.gtk_id}
                    onChange={(e) => setEditForm((f) => ({ ...f, gtk_id: e.target.value }))}
                    required
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Pilih guru --</option>
                    {gtkOptions.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.nama} {g.nip ? `(NIP: ${g.nip})` : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={gtkMap.get(editForm.gtk_id)?.nama ?? gtkNama ?? ""}
                    disabled
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-3 py-2 text-sm"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">Tanggal</label>
                  <div className="relative">
                    <input
                      id="jadwal-supervisi-edit-tanggal"
                      type="date"
                      value={editForm.tanggal}
                      onChange={(e) => setEditForm((f) => ({ ...f, tanggal: e.target.value }))}
                      required
                      className="jadwal-date-input w-full rounded-lg border border-slate-300 dark:border-slate-600 pl-3 pr-10 py-2 text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() =>
                        (document.getElementById("jadwal-supervisi-edit-tanggal") as HTMLInputElement | null)?.showPicker?.()
                      }
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400"
                    >
                      <Calendar className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">Tahun</label>
                  <input
                    type="number"
                    value={editForm.tahun}
                    onChange={(e) => setEditForm((f) => ({ ...f, tahun: Number(e.target.value) }))}
                    placeholder="2026"
                    required
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">Kelas</label>
                  <select
                    value={editForm.rombel}
                    onChange={(e) => setEditForm((f) => ({ ...f, rombel: e.target.value }))}
                    required
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Pilih --</option>
                    {rombelOptions.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">Jam ke</label>
                  <select
                    value={editForm.jam_ke}
                    onChange={(e) => setEditForm((f) => ({ ...f, jam_ke: Number(e.target.value) }))}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {JAM_KE_OPTIONS.map((j) => (
                      <option key={j} value={j}>
                        {j}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">Status Proses</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value as StatusSupervisi }))}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {STATUS_SUPERVISI_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                    Link Dokumen
                  </label>
                  <input
                    type="url"
                    value={editForm.link_dokumen}
                    onChange={(e) => setEditForm((f) => ({ ...f, link_dokumen: e.target.value }))}
                    placeholder="https://drive.google.com/..."
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                  Deskripsi Pokok Bahasan
                </label>
                <textarea
                  value={editForm.deskripsi_pokok_bahasan}
                  onChange={(e) => setEditForm((f) => ({ ...f, deskripsi_pokok_bahasan: e.target.value }))}
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {actionError && (
                <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg px-3 py-2">
                  {actionError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setEditTarget(null)}
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
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1.5">Hapus jadwal supervisi ini?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
              Jadwal tanggal{" "}
              <span className="font-medium text-slate-700 dark:text-slate-200">{formatTanggal(deleteTarget.tanggal)}</span> akan
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
