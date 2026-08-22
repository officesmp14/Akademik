"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useModulePermission, useRole } from "@/lib/role-context";
import { getPageNumbers } from "@/lib/pagination";
import { compareKelas } from "@/lib/rekap-siswa";
import { Siswa } from "@/types/siswa";
import { ChevronLeft, Loader2, Search, ListChecks, Pencil, X } from "lucide-react";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

type RowKelasIx = Pick<
  Siswa,
  | "id"
  | "nama"
  | "nipd"
  | "jk"
  | "nisn"
  | "tempat_lahir"
  | "tanggal_lahir"
  | "nik"
  | "nama_ayah"
  | "rombel"
  | "no_kk"
  | "updated_at"
  | "updated_by_nama"
>;

type EditForm = {
  nipd: string;
  jk: string;
  nisn: string;
  tempat_lahir: string;
  tanggal_lahir: string;
  nik: string;
  nama_ayah: string;
  no_kk: string;
};

const emptyEditForm: EditForm = {
  nipd: "",
  jk: "",
  nisn: "",
  tempat_lahir: "",
  tanggal_lahir: "",
  nik: "",
  nama_ayah: "",
  no_kk: "",
};

export default function LaporanKelasIxPage() {
  const { role, waliKelasRombel, gtkNama, email } = useRole();
  const { canEdit: canEditModule } = useModulePermission("siswa");
  const isFullAccessRole = role === "admin" || role === "kepala_sekolah";
  const lockedToOwnClass = !isFullAccessRole && Boolean(waliKelasRombel);
  const canEdit = canEditModule || lockedToOwnClass;

  const [data, setData] = useState<RowKelasIx[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterRombel, setFilterRombel] = useState("");
  const [rombelOptions, setRombelOptions] = useState<string[]>([]);

  const [editTarget, setEditTarget] = useState<RowKelasIx | null>(null);
  const [editForm, setEditForm] = useState<EditForm>(emptyEditForm);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Ambil daftar rombel Kelas IX yang ada untuk isi dropdown filter
  useEffect(() => {
    if (lockedToOwnClass) return;
    async function fetchRombelOptions() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("siswa01")
        .select("rombel")
        .eq("status_siswa", "Aktif")
        .ilike("rombel", "IX.%");

      if (!error && data) {
        const unique = Array.from(
          new Set(data.map((d) => d.rombel).filter(Boolean) as string[])
        ).sort(compareKelas);
        setRombelOptions(unique);
      }
    }
    fetchRombelOptions();
  }, [lockedToOwnClass]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();

    let query = supabase
      .from("siswa01")
      .select(
        "id, nama, nipd, jk, nisn, tempat_lahir, tanggal_lahir, nik, nama_ayah, rombel, no_kk, updated_at, updated_by_nama",
        { count: "exact" }
      )
      .eq("status_siswa", "Aktif")
      .ilike("rombel", "IX.%")
      .order("rombel", { ascending: true })
      .order("nama", { ascending: true })
      .range(page * pageSize, page * pageSize + pageSize - 1);

    if (search.trim()) {
      query = query.or(
        `nama.ilike.%${search}%,nisn.ilike.%${search}%,nipd.ilike.%${search}%`
      );
    }
    const effectiveRombel = lockedToOwnClass ? waliKelasRombel : filterRombel;
    if (effectiveRombel) query = query.eq("rombel", effectiveRombel);

    const { data, count, error } = await query;

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setData(data ?? []);
    setTotal(count ?? 0);
    setLoading(false);
  }, [page, pageSize, search, filterRombel, lockedToOwnClass, waliKelasRombel]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function openEdit(row: RowKelasIx) {
    setEditTarget(row);
    setEditForm({
      nipd: row.nipd ?? "",
      jk: row.jk ?? "",
      nisn: row.nisn ?? "",
      tempat_lahir: row.tempat_lahir ?? "",
      tanggal_lahir: row.tanggal_lahir ?? "",
      nik: row.nik ?? "",
      nama_ayah: row.nama_ayah ?? "",
      no_kk: row.no_kk ?? "",
    });
    setErrorMsg(null);
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget?.id) return;

    setSaving(true);
    setErrorMsg(null);
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const payload = {
      nipd: editForm.nipd || null,
      jk: editForm.jk || null,
      nisn: editForm.nisn || null,
      tempat_lahir: editForm.tempat_lahir || null,
      tanggal_lahir: editForm.tanggal_lahir || null,
      nik: editForm.nik || null,
      nama_ayah: editForm.nama_ayah || null,
      no_kk: editForm.no_kk || null,
      updated_at: new Date().toISOString(),
      updated_by: user?.id ?? null,
      updated_by_nama: gtkNama || email || null,
    };

    const { error } = await supabase.from("siswa01").update(payload).eq("id", editTarget.id);

    setSaving(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    setEditTarget(null);
    fetchData();
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="p-6 md:p-8">
      <a
        href="/laporan"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 mb-4"
      >
        <ChevronLeft className="h-4 w-4" />
        Kembali ke Laporan
      </a>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Cek Data Ijazah Kelas IX</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {lockedToOwnClass && (
            <>
              Wali Kelas <strong>{waliKelasRombel}</strong> &middot;{" "}
            </>
          )}
          {total} siswa kelas IX aktif
        </p>
      </div>

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
            placeholder="Cari nama, NISN, atau NIPD..."
            className="w-full sm:w-72 rounded-lg border border-slate-300 dark:border-slate-600 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        {!lockedToOwnClass && (
          <select
            value={filterRombel}
            onChange={(e) => {
              setFilterRombel(e.target.value);
              setPage(0);
            }}
            className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">Semua Kelas IX</option>
            {rombelOptions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg px-3 py-2 mb-4">
          {error}
        </p>
      )}

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40 text-left text-slate-500 dark:text-slate-400">
                <th className="px-4 py-3 font-medium w-12">No</th>
                <th className="px-4 py-3 font-medium">Nama</th>
                <th className="px-4 py-3 font-medium">NIPD</th>
                <th className="px-4 py-3 font-medium">JK</th>
                <th className="px-4 py-3 font-medium">NISN</th>
                <th className="px-4 py-3 font-medium">Tempat Lahir</th>
                <th className="px-4 py-3 font-medium">Tanggal Lahir</th>
                <th className="px-4 py-3 font-medium">NIK</th>
                <th className="px-4 py-3 font-medium">Nama Ayah</th>
                <th className="px-4 py-3 font-medium">Kelas</th>
                <th className="px-4 py-3 font-medium">No KK</th>
                <th className="px-4 py-3 font-medium">Terakhir Diubah</th>
                {canEdit && <th className="px-4 py-3 font-medium text-right">Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={canEdit ? 13 : 12} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 13 : 12} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500">
                    <ListChecks className="h-6 w-6 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    Belum ada data siswa kelas IX yang cocok.
                  </td>
                </tr>
              ) : (
                data.map((s, idx) => (
                  <tr key={s.id} className="border-b border-slate-100 dark:border-slate-700/60 last:border-0 hover:bg-slate-50/60 dark:hover:bg-slate-700/60">
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{page * pageSize + idx + 1}</td>
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{s.nama || "-"}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{s.nipd || "-"}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{s.jk || "-"}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{s.nisn || "-"}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{s.tempat_lahir || "-"}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{s.tanggal_lahir || "-"}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{s.nik || "-"}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{s.nama_ayah || "-"}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{s.rombel || "-"}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{s.no_kk || "-"}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">
                      {s.updated_by_nama ? (
                        <>
                          {s.updated_by_nama}
                          <br />
                          {s.updated_at ? new Date(s.updated_at).toLocaleString("id-ID") : ""}
                        </>
                      ) : (
                        "-"
                      )}
                    </td>
                    {canEdit && (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end">
                          <button
                            onClick={() => openEdit(s)}
                            title="Edit"
                            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-end px-4 py-3 border-t border-slate-200 dark:border-slate-700">
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
      </div>

      {editTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-lg w-full shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{editTarget.nama || "-"}</h3>
              <button onClick={() => setEditTarget(null)}>
                <X className="h-5 w-5 text-slate-400 dark:text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">NIPD</label>
                  <input
                    type="text"
                    value={editForm.nipd}
                    onChange={(e) => setEditForm((f) => ({ ...f, nipd: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                    Jenis Kelamin
                  </label>
                  <select
                    value={editForm.jk}
                    onChange={(e) => setEditForm((f) => ({ ...f, jk: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">(belum diisi)</option>
                    <option value="L">L</option>
                    <option value="P">P</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">NISN</label>
                  <input
                    type="text"
                    value={editForm.nisn}
                    onChange={(e) => setEditForm((f) => ({ ...f, nisn: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">NIK</label>
                  <input
                    type="text"
                    value={editForm.nik}
                    onChange={(e) => setEditForm((f) => ({ ...f, nik: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                    Tempat Lahir
                  </label>
                  <input
                    type="text"
                    value={editForm.tempat_lahir}
                    onChange={(e) => setEditForm((f) => ({ ...f, tempat_lahir: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                    Tanggal Lahir
                  </label>
                  <input
                    type="date"
                    value={editForm.tanggal_lahir}
                    onChange={(e) => setEditForm((f) => ({ ...f, tanggal_lahir: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                    Nama Ayah
                  </label>
                  <input
                    type="text"
                    value={editForm.nama_ayah}
                    onChange={(e) => setEditForm((f) => ({ ...f, nama_ayah: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">No KK</label>
                  <input
                    type="text"
                    value={editForm.no_kk}
                    onChange={(e) => setEditForm((f) => ({ ...f, no_kk: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {errorMsg && (
                <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg px-3 py-2">
                  {errorMsg}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
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
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
