"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRole } from "@/lib/role-context";
import { compareKelas } from "@/lib/rekap-siswa";
import { getTahunAjaranSaatIni, getSemesterSaatIni } from "@/types/nilai";
import { SiswaEkskul } from "@/types/ekskul";
import { Pencil, Trash2, Loader2, X, Plus, Trophy, Search } from "lucide-react";

type EkskulOption = { kode: number; uraian: string };
type SiswaOption = { id: string; nama: string | null; nisn: string | null; rombel: string | null };
type GtkOption = { id: string; nama: string | null };
type KetuaRow = { ekskul_kode: number; gtk_id: string };

type FormState = {
  siswa_id: string;
  ekskul_kode: string;
  gtk_id: string;
  tahun_ajaran: string;
  semester: "Ganjil" | "Genap";
};

export default function EkstrakurikulerSiswaPage() {
  const { role, gtkId, gtkNama, waliKelasRombel } = useRole();
  const isFullAccessRole = role === "admin" || role === "kepala_sekolah";
  const lockedToOwnClass = !isFullAccessRole && Boolean(waliKelasRombel);

  const [rows, setRows] = useState<SiswaEkskul[]>([]);
  const [ekskulOptions, setEkskulOptions] = useState<EkskulOption[]>([]);
  const [siswaOptions, setSiswaOptions] = useState<SiswaOption[]>([]);
  const [gtkOptions, setGtkOptions] = useState<GtkOption[]>([]);
  const [ketuaList, setKetuaList] = useState<KetuaRow[]>([]);

  const [tahunAjaranFilter, setTahunAjaranFilter] = useState(getTahunAjaranSaatIni());
  const [semesterFilter, setSemesterFilter] = useState<"Ganjil" | "Genap">(getSemesterSaatIni());
  const [ekskulFilter, setEkskulFilter] = useState("");
  const [rombelFilter, setRombelFilter] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<SiswaEkskul | null>(null);
  const [form, setForm] = useState<FormState>({
    siswa_id: "",
    ekskul_kode: "",
    gtk_id: "",
    tahun_ajaran: tahunAjaranFilter,
    semester: semesterFilter,
  });
  const [deleteTarget, setDeleteTarget] = useState<SiswaEkskul | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [bulkTahunAjaran, setBulkTahunAjaran] = useState(tahunAjaranFilter);
  const [bulkSemester, setBulkSemester] = useState<"Ganjil" | "Genap">(semesterFilter);
  const [bulkEkskulKode, setBulkEkskulKode] = useState("");
  const [bulkGtkId, setBulkGtkId] = useState("");
  const [searchSiswa, setSearchSiswa] = useState("");
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function fetchDefaultPeriode() {
      const supabase = createClient();
      const { data } = await supabase
        .from("pengaturan_akademik")
        .select("tahun_ajaran, semester")
        .eq("id", 1)
        .maybeSingle();
      if (data) {
        setTahunAjaranFilter(data.tahun_ajaran);
        setSemesterFilter(data.semester);
      }
    }
    fetchDefaultPeriode();
  }, []);

  useEffect(() => {
    if (lockedToOwnClass) setRombelFilter(waliKelasRombel!);
  }, [lockedToOwnClass, waliKelasRombel]);

  const fetchAll = useCallback(async () => {
    if (!tahunAjaranFilter) return;
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const [rowsRes, ekskulRes, siswaRes, gtkRes, ketuaRes] = await Promise.all([
      supabase
        .from("siswa_ekskul")
        .select("id, tahun_ajaran, semester, siswa_id, ekskul_kode, gtk_id")
        .eq("tahun_ajaran", tahunAjaranFilter)
        .eq("semester", semesterFilter),
      supabase.from("ref_ekstrakurikuler").select("kode, uraian").order("uraian", { ascending: true }),
      supabase
        .from("siswa01")
        .select("id, nama, nisn, rombel")
        .eq("status_siswa", "Aktif")
        .order("nama", { ascending: true }),
      supabase.from("gtk_nama_publik").select("id, nama").order("nama", { ascending: true }),
      supabase.from("ketua_ekskul").select("ekskul_kode, gtk_id"),
    ]);

    if (rowsRes.error) {
      setError(rowsRes.error.message);
      setLoading(false);
      return;
    }

    setRows(rowsRes.data ?? []);
    setEkskulOptions(ekskulRes.data ?? []);
    setSiswaOptions(siswaRes.data ?? []);
    setGtkOptions(gtkRes.data ?? []);
    setKetuaList(ketuaRes.data ?? []);
    setLoading(false);
  }, [tahunAjaranFilter, semesterFilter]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const ekskulMap = useMemo(() => new Map(ekskulOptions.map((e) => [e.kode, e])), [ekskulOptions]);
  const siswaMap = useMemo(() => new Map(siswaOptions.map((s) => [s.id, s])), [siswaOptions]);
  const gtkMap = useMemo(() => new Map(gtkOptions.map((g) => [g.id, g])), [gtkOptions]);
  const ketuaByEkskul = useMemo(() => new Map(ketuaList.map((k) => [k.ekskul_kode, k.gtk_id])), [ketuaList]);
  const myEkskulKodes = useMemo(
    () => ketuaList.filter((k) => k.gtk_id === gtkId).map((k) => k.ekskul_kode),
    [ketuaList, gtkId]
  );
  // Guru pembina (ketua ekskul) dikunci -- cuma lihat peserta ekstrakurikuler
  // yang dia bina sendiri, bukan punya guru lain.
  const lockedToOwnEkskul = !isFullAccessRole && myEkskulKodes.length > 0;

  const canCreate = isFullAccessRole || myEkskulKodes.length > 0;
  const ekskulOptionsUntukForm = isFullAccessRole
    ? ekskulOptions
    : ekskulOptions.filter((e) => myEkskulKodes.includes(e.kode));

  function canManageRow(row: SiswaEkskul) {
    return isFullAccessRole || myEkskulKodes.includes(row.ekskul_kode);
  }

  const rombelOptions = useMemo(
    () =>
      Array.from(new Set(siswaOptions.map((s) => s.rombel).filter(Boolean) as string[])).sort(compareKelas),
    [siswaOptions]
  );

  const filteredRows = rows.filter((r) => {
    if (lockedToOwnEkskul && !myEkskulKodes.includes(r.ekskul_kode)) return false;
    if (ekskulFilter && r.ekskul_kode !== Number(ekskulFilter)) return false;
    if (rombelFilter && siswaMap.get(r.siswa_id)?.rombel !== rombelFilter) return false;
    return true;
  });

  function openBulkAdd() {
    setBulkTahunAjaran(tahunAjaranFilter);
    setBulkSemester(semesterFilter);
    const defaultEkskul = ekskulOptionsUntukForm.length === 1 ? String(ekskulOptionsUntukForm[0].kode) : "";
    setBulkEkskulKode(defaultEkskul);
    setBulkGtkId(
      lockedToOwnEkskul ? gtkId ?? "" : defaultEkskul ? ketuaByEkskul.get(Number(defaultEkskul)) ?? "" : ""
    );
    setSearchSiswa("");
    setCheckedIds(new Set());
    setActionError(null);
    setShowBulkAdd(true);
  }

  function handleBulkEkskulChange(kode: string) {
    setBulkEkskulKode(kode);
    if (!lockedToOwnEkskul) setBulkGtkId(ketuaByEkskul.get(Number(kode)) ?? "");
  }

  function toggleChecked(siswaId: string) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(siswaId)) next.delete(siswaId);
      else next.add(siswaId);
      return next;
    });
  }

  async function handleBulkSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!bulkEkskulKode || !bulkTahunAjaran || checkedIds.size === 0) {
      setActionError("Pilih ekstrakurikuler, tahun ajaran, dan minimal satu siswa.");
      return;
    }

    setSaving(true);
    setActionError(null);
    const supabase = createClient();

    const payload = Array.from(checkedIds).map((siswaId) => ({
      tahun_ajaran: bulkTahunAjaran,
      semester: bulkSemester,
      siswa_id: siswaId,
      ekskul_kode: Number(bulkEkskulKode),
      gtk_id: bulkGtkId || null,
    }));

    const { error } = await supabase
      .from("siswa_ekskul")
      .upsert(payload, { onConflict: "tahun_ajaran,semester,siswa_id,ekskul_kode", ignoreDuplicates: true });

    setSaving(false);

    if (error) {
      setActionError(error.message);
      return;
    }

    setShowBulkAdd(false);
    fetchAll();
  }

  function openEdit(row: SiswaEkskul) {
    setEditTarget(row);
    setForm({
      siswa_id: row.siswa_id,
      ekskul_kode: String(row.ekskul_kode),
      gtk_id: row.gtk_id ?? "",
      tahun_ajaran: row.tahun_ajaran,
      semester: row.semester,
    });
    setActionError(null);
    setShowForm(true);
  }

  function handleEkskulChange(kode: string) {
    setForm((f) => ({
      ...f,
      ekskul_kode: kode,
      gtk_id: ketuaByEkskul.get(Number(kode)) ?? f.gtk_id,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.siswa_id || !form.ekskul_kode || !form.tahun_ajaran) {
      setActionError("Lengkapi siswa, ekstrakurikuler, dan tahun ajaran terlebih dahulu.");
      return;
    }

    setSaving(true);
    setActionError(null);
    const supabase = createClient();

    const payload = {
      siswa_id: form.siswa_id,
      ekskul_kode: Number(form.ekskul_kode),
      gtk_id: form.gtk_id || null,
      tahun_ajaran: form.tahun_ajaran,
      semester: form.semester,
    };

    const { error } = editTarget
      ? await supabase.from("siswa_ekskul").update(payload).eq("id", editTarget.id)
      : await supabase.from("siswa_ekskul").insert(payload);

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
    const { error } = await supabase.from("siswa_ekskul").delete().eq("id", deleteTarget.id);
    setSaving(false);
    if (!error) {
      setDeleteTarget(null);
      fetchAll();
    } else {
      setActionError(error.message);
    }
  }

  const rombelSortedSiswa = [...siswaOptions].sort((a, b) => {
    const r = compareKelas(a.rombel ?? "", b.rombel ?? "");
    if (r !== 0) return r;
    return (a.nama ?? "").localeCompare(b.nama ?? "");
  });

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Ekstrakurikuler Siswa</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {lockedToOwnClass && (
              <>
                Wali Kelas <strong>{waliKelasRombel}</strong> &middot;{" "}
              </>
            )}
            Pendaftaran siswa ke ekstrakurikuler, per tahun ajaran &amp; semester
          </p>
        </div>
        {canCreate && (
          <button
            onClick={openBulkAdd}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white text-sm font-medium px-4 py-2 hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            Tambah Peserta
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-5">
        {!lockedToOwnClass && (
          <select
            value={rombelFilter}
            onChange={(e) => setRombelFilter(e.target.value)}
            className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Semua Kelas</option>
            {rombelOptions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        )}

        <select
          value={ekskulFilter}
          onChange={(e) => setEkskulFilter(e.target.value)}
          className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Semua Ekstrakurikuler</option>
          {ekskulOptionsUntukForm.map((e) => (
            <option key={e.kode} value={e.kode}>
              {e.uraian}
            </option>
          ))}
        </select>

        <select
          value={semesterFilter}
          onChange={(e) => setSemesterFilter(e.target.value as "Ganjil" | "Genap")}
          className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="Ganjil">Semester Ganjil</option>
          <option value="Genap">Semester Genap</option>
        </select>

        <input
          value={tahunAjaranFilter}
          onChange={(e) => setTahunAjaranFilter(e.target.value)}
          className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm w-32 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="2026/2027"
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
              <th className="px-4 py-3 font-medium">Nama Siswa</th>
              <th className="px-4 py-3 font-medium">NISN</th>
              <th className="px-4 py-3 font-medium">Kelas</th>
              <th className="px-4 py-3 font-medium">Ekstrakurikuler</th>
              <th className="px-4 py-3 font-medium">Guru Pembina</th>
              <th className="px-4 py-3 font-medium text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                </td>
              </tr>
            ) : filteredRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500">
                  <Trophy className="h-6 w-6 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                  Belum ada siswa terdaftar untuk periode ini.
                </td>
              </tr>
            ) : (
              filteredRows.map((row, idx) => {
                const siswa = siswaMap.get(row.siswa_id);
                const ekskul = ekskulMap.get(row.ekskul_kode);
                const gtk = row.gtk_id ? gtkMap.get(row.gtk_id) : null;
                const canManage = canManageRow(row);
                return (
                  <tr key={row.id} className="border-b border-slate-100 dark:border-slate-700/60 last:border-0 hover:bg-slate-50/60 dark:hover:bg-slate-700/40">
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{idx + 1}</td>
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{siswa?.nama || "-"}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{siswa?.nisn || "-"}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{siswa?.rombel || "-"}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{ekskul?.uraian || "-"}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {gtk ? gtk.nama : <span className="text-slate-400 dark:text-slate-500">-</span>}
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

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-md w-full shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">Ubah Peserta Ekstrakurikuler</h3>
              <button onClick={() => setShowForm(false)}>
                <X className="h-4 w-4 text-slate-400 dark:text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">Siswa</label>
                <select
                  value={form.siswa_id}
                  onChange={(e) => setForm((f) => ({ ...f, siswa_id: e.target.value }))}
                  required
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Pilih siswa --</option>
                  {rombelSortedSiswa.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nama} ({s.nisn || "-"}) - {s.rombel || "-"}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                  Ekstrakurikuler
                </label>
                <select
                  value={form.ekskul_kode}
                  onChange={(e) => handleEkskulChange(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Pilih ekstrakurikuler --</option>
                  {ekskulOptionsUntukForm.map((e) => (
                    <option key={e.kode} value={e.kode}>
                      {e.uraian}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                  Guru Pembina
                </label>
                <select
                  value={form.gtk_id}
                  onChange={(e) => setForm((f) => ({ ...f, gtk_id: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Belum ditentukan --</option>
                  {gtkOptions.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.nama}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  Otomatis terisi dari ketua ekstrakurikuler yang dipilih, bisa diganti kalau perlu.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                    Semester
                  </label>
                  <select
                    value={form.semester}
                    onChange={(e) => setForm((f) => ({ ...f, semester: e.target.value as "Ganjil" | "Genap" }))}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Ganjil">Ganjil</option>
                    <option value="Genap">Genap</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                    Tahun Ajaran
                  </label>
                  <input
                    value={form.tahun_ajaran}
                    onChange={(e) => setForm((f) => ({ ...f, tahun_ajaran: e.target.value }))}
                    placeholder="2026/2027"
                    required
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
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

      {showBulkAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-2xl w-full shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-4 shrink-0">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">Tambah Peserta Ekstrakurikuler</h3>
              <button onClick={() => setShowBulkAdd(false)}>
                <X className="h-4 w-4 text-slate-400 dark:text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleBulkSubmit} className="flex flex-col min-h-0 flex-1">
              <div className="grid grid-cols-2 gap-4 shrink-0 mb-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                    Tahun Ajaran
                  </label>
                  <input
                    value={bulkTahunAjaran}
                    onChange={(e) => setBulkTahunAjaran(e.target.value)}
                    placeholder="2026/2027"
                    required
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                    Semester
                  </label>
                  <select
                    value={bulkSemester}
                    onChange={(e) => setBulkSemester(e.target.value as "Ganjil" | "Genap")}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Ganjil">Ganjil</option>
                    <option value="Genap">Genap</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                    Ekstrakurikuler
                  </label>
                  <select
                    value={bulkEkskulKode}
                    onChange={(e) => handleBulkEkskulChange(e.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Pilih --</option>
                    {ekskulOptionsUntukForm.map((e) => (
                      <option key={e.kode} value={e.kode}>
                        {e.uraian}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                    Guru Pembina
                  </label>
                  {lockedToOwnEkskul ? (
                    <input
                      value={gtkNama ?? ""}
                      disabled
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-3 py-2 text-sm"
                    />
                  ) : (
                    <select
                      value={bulkGtkId}
                      onChange={(e) => setBulkGtkId(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">-- Belum ditentukan --</option>
                      {gtkOptions.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.nama}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="shrink-0 mb-3">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                  Cari nama siswa:
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                  <input
                    value={searchSiswa}
                    onChange={(e) => setSearchSiswa(e.target.value)}
                    placeholder="Ketik nama atau NISN..."
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-auto flex-1">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-50 dark:bg-slate-700/40">
                    <tr className="border-b border-slate-200 dark:border-slate-700 text-left text-slate-500 dark:text-slate-400">
                      <th className="px-3 py-2.5 font-medium w-14">Check</th>
                      <th className="px-3 py-2.5 font-medium w-12">No</th>
                      <th className="px-3 py-2.5 font-medium">Nama Siswa</th>
                      <th className="px-3 py-2.5 font-medium">NISN</th>
                      <th className="px-3 py-2.5 font-medium">Kelas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const q = searchSiswa.trim().toLowerCase();
                      const daftar = q
                        ? rombelSortedSiswa.filter(
                            (s) => (s.nama ?? "").toLowerCase().includes(q) || (s.nisn ?? "").includes(q)
                          )
                        : rombelSortedSiswa;

                      if (daftar.length === 0) {
                        return (
                          <tr>
                            <td colSpan={5} className="px-3 py-8 text-center text-slate-400 dark:text-slate-500">
                              Tidak ada siswa yang cocok.
                            </td>
                          </tr>
                        );
                      }

                      return daftar.map((s, idx) => (
                        <tr key={s.id} className="border-b border-slate-100 dark:border-slate-700/60 last:border-0">
                          <td className="px-3 py-2 align-top">
                            <input
                              type="checkbox"
                              checked={checkedIds.has(s.id)}
                              onChange={() => toggleChecked(s.id)}
                              className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500"
                            />
                          </td>
                          <td className="px-3 py-2 align-top text-slate-500 dark:text-slate-400">{idx + 1}</td>
                          <td className="px-3 py-2 align-top text-slate-800 dark:text-slate-200">{s.nama}</td>
                          <td className="px-3 py-2 align-top text-slate-600 dark:text-slate-300">{s.nisn || "-"}</td>
                          <td className="px-3 py-2 align-top text-slate-600 dark:text-slate-300">{s.rombel || "-"}</td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>

              {actionError && (
                <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg px-3 py-2 mt-4 shrink-0">
                  {actionError}
                </p>
              )}

              <div className="flex items-center justify-between gap-2 pt-4 shrink-0">
                <span className="text-xs text-slate-400 dark:text-slate-500">{checkedIds.size} siswa dipilih</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowBulkAdd(false)}
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
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1.5">Hapus peserta ekstrakurikuler ini?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
              Pendaftaran{" "}
              <span className="font-medium text-slate-700 dark:text-slate-200">
                {siswaMap.get(deleteTarget.siswa_id)?.nama}
              </span>{" "}
              di ekstrakurikuler{" "}
              <span className="font-medium text-slate-700 dark:text-slate-200">
                {ekskulMap.get(deleteTarget.ekskul_kode)?.uraian}
              </span>{" "}
              akan dihapus permanen.
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
