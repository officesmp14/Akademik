"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useModulePermission, useRole } from "@/lib/role-context";
import { getPageNumbers } from "@/lib/pagination";
import { compareKelas } from "@/lib/rekap-siswa";
import { getTahunAjaranSaatIni } from "@/types/nilai";
import {
  BIDANG_OPTIONS,
  TINGKAT_OPTIONS,
  JENIS_OPTIONS,
  PERINGKAT_OPTIONS,
  type PrestasiSiswa,
} from "@/lib/prestasi-siswa";
import { Award, Loader2, Pencil, Plus, Search, Trash2, X, ExternalLink } from "lucide-react";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

type SiswaPilihan = { id: string; nama: string | null; nisn: string | null; rombel: string | null };

type FormState = {
  tahun_ajaran: string;
  bidang: string;
  cabang: string;
  nama_kegiatan: string;
  tingkat: string;
  jenis: string;
  peringkat: string;
  penyelenggara: string;
  tanggal: string;
  bukti_url: string;
  keterangan: string;
};

function emptyForm(): FormState {
  return {
    tahun_ajaran: getTahunAjaranSaatIni(),
    bidang: "Non Akademik",
    cabang: "",
    nama_kegiatan: "",
    tingkat: "Kota",
    jenis: "Individu",
    peringkat: "Juara 1",
    penyelenggara: "",
    tanggal: "",
    bukti_url: "",
    keterangan: "",
  };
}

function daftarTahunAjaran(): string[] {
  const awal = Number(getTahunAjaranSaatIni().split("/")[0]);
  return [0, 1, 2, 3, 4].map((i) => `${awal - i}/${awal - i + 1}`);
}

const inputClass =
  "w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500";
const labelClass = "block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5";
const filterClass =
  "rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500";

export default function PrestasiSiswaPage() {
  const { canEdit: canEditModule } = useModulePermission("prestasi_siswa");
  const { role, waliKelasRombel } = useRole();
  const isFullAccessRole = role === "admin" || role === "kepala_sekolah";
  const lockedToOwnClass = !isFullAccessRole && Boolean(waliKelasRombel);
  const canEdit = isFullAccessRole || canEditModule || lockedToOwnClass;

  const [data, setData] = useState<PrestasiSiswa[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filterTahun, setFilterTahun] = useState("");
  const [filterBidang, setFilterBidang] = useState("");
  const [filterTingkat, setFilterTingkat] = useState("");
  const [filterRombel, setFilterRombel] = useState("");
  const [rombelOptions, setRombelOptions] = useState<string[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PrestasiSiswa | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [siswaTerpilih, setSiswaTerpilih] = useState<SiswaPilihan | null>(null);
  const [siswaQuery, setSiswaQuery] = useState("");
  const [siswaHasil, setSiswaHasil] = useState<SiswaPilihan[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<PrestasiSiswa | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (lockedToOwnClass) return;
    async function fetchRombelOptions() {
      const supabase = createClient();
      const { data } = await supabase.from("siswa01").select("rombel").not("rombel", "is", null);
      const unique = Array.from(new Set((data ?? []).map((d) => d.rombel).filter(Boolean) as string[])).sort(
        compareKelas
      );
      setRombelOptions(unique);
    }
    fetchRombelOptions();
  }, [lockedToOwnClass]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();

    let query = supabase
      .from("prestasi_siswa")
      .select("*, siswa01!inner(nama, nisn, rombel)", { count: "exact" })
      .order("tanggal", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .range(page * pageSize, page * pageSize + pageSize - 1);

    if (search.trim()) query = query.ilike("siswa01.nama", `%${search.trim()}%`);
    if (filterTahun) query = query.eq("tahun_ajaran", filterTahun);
    if (filterBidang) query = query.eq("bidang", filterBidang);
    if (filterTingkat) query = query.eq("tingkat", filterTingkat);
    const effectiveRombel = lockedToOwnClass ? waliKelasRombel : filterRombel;
    if (effectiveRombel) query = query.eq("siswa01.rombel", effectiveRombel);

    const { data, count, error } = await query;
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setData((data ?? []) as unknown as PrestasiSiswa[]);
    setTotal(count ?? 0);
    setLoading(false);
  }, [page, pageSize, search, filterTahun, filterBidang, filterTingkat, filterRombel, lockedToOwnClass, waliKelasRombel]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Cari siswa (aktif) untuk form tambah -- tunda sebentar biar tidak query tiap ketikan
  useEffect(() => {
    if (!showForm || editing || siswaTerpilih || siswaQuery.trim().length < 2) return;
    const timer = setTimeout(async () => {
      const supabase = createClient();
      let q = supabase
        .from("siswa01")
        .select("id, nama, nisn, rombel")
        .eq("status_siswa", "Aktif")
        .ilike("nama", `%${siswaQuery.trim()}%`)
        .order("nama", { ascending: true })
        .limit(8);
      if (lockedToOwnClass && waliKelasRombel) q = q.eq("rombel", waliKelasRombel);
      const { data } = await q;
      setSiswaHasil((data ?? []) as SiswaPilihan[]);
    }, 300);
    return () => clearTimeout(timer);
  }, [siswaQuery, showForm, editing, siswaTerpilih, lockedToOwnClass, waliKelasRombel]);

  function openAdd() {
    setEditing(null);
    setForm(emptyForm());
    setSiswaTerpilih(null);
    setSiswaQuery("");
    setSiswaHasil([]);
    setFormError(null);
    setShowForm(true);
  }

  function openEdit(row: PrestasiSiswa) {
    setEditing(row);
    setForm({
      tahun_ajaran: row.tahun_ajaran,
      bidang: row.bidang,
      cabang: row.cabang ?? "",
      nama_kegiatan: row.nama_kegiatan,
      tingkat: row.tingkat,
      jenis: row.jenis,
      peringkat: row.peringkat,
      penyelenggara: row.penyelenggara ?? "",
      tanggal: row.tanggal ?? "",
      bukti_url: row.bukti_url ?? "",
      keterangan: row.keterangan ?? "",
    });
    setSiswaTerpilih({
      id: row.siswa_id,
      nama: row.siswa01?.nama ?? null,
      nisn: row.siswa01?.nisn ?? null,
      rombel: row.siswa01?.rombel ?? null,
    });
    setFormError(null);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!siswaTerpilih) {
      setFormError("Pilih siswa terlebih dahulu.");
      return;
    }
    if (!form.nama_kegiatan.trim()) {
      setFormError("Nama kegiatan/lomba wajib diisi.");
      return;
    }

    setSaving(true);
    setFormError(null);
    const supabase = createClient();

    const payload = {
      siswa_id: siswaTerpilih.id,
      tahun_ajaran: form.tahun_ajaran.trim(),
      bidang: form.bidang,
      cabang: form.cabang.trim() || null,
      nama_kegiatan: form.nama_kegiatan.trim(),
      tingkat: form.tingkat,
      jenis: form.jenis,
      peringkat: form.peringkat,
      penyelenggara: form.penyelenggara.trim() || null,
      tanggal: form.tanggal || null,
      bukti_url: form.bukti_url.trim() || null,
      keterangan: form.keterangan.trim() || null,
      updated_at: new Date().toISOString(),
    };

    if (editing) {
      const { data, error } = await supabase.from("prestasi_siswa").update(payload).eq("id", editing.id).select("id");
      setSaving(false);
      if (error) {
        setFormError(error.message);
        return;
      }
      if (!data || data.length === 0) {
        setFormError(
          "Tidak ada baris yang tersimpan -- kemungkinan akun ini belum punya izin ubah (jalankan supabase/prestasi-siswa-schema.sql)."
        );
        return;
      }
    } else {
      const { error } = await supabase.from("prestasi_siswa").insert(payload);
      setSaving(false);
      if (error) {
        setFormError(error.message);
        return;
      }
    }

    setShowForm(false);
    fetchData();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    const supabase = createClient();
    const { data, error } = await supabase.from("prestasi_siswa").delete().eq("id", deleteTarget.id).select("id");
    setDeleting(false);
    if (error) {
      setDeleteError(error.message);
      return;
    }
    if (!data || data.length === 0) {
      setDeleteError("Tidak ada baris yang terhapus -- kemungkinan akun ini belum punya izin hapus.");
      return;
    }
    setDeleteTarget(null);
    fetchData();
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Prestasi Siswa</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Catatan prestasi akademik dan non akademik siswa — total <strong>{total}</strong> prestasi
          </p>
        </div>
        {canEdit && (
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white text-sm font-medium px-4 py-2 hover:bg-indigo-700 shrink-0"
          >
            <Plus className="h-4 w-4" />
            Tambah Prestasi
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <select
          value={pageSize}
          onChange={(e) => {
            setPageSize(Number(e.target.value));
            setPage(0);
          }}
          className={filterClass}
        >
          {PAGE_SIZE_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n} / halaman
            </option>
          ))}
        </select>

        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Cari nama siswa..."
            className={`${filterClass} pl-9 w-56`}
          />
        </div>

        <select
          value={filterTahun}
          onChange={(e) => {
            setFilterTahun(e.target.value);
            setPage(0);
          }}
          className={filterClass}
        >
          <option value="">Semua Tahun Ajaran</option>
          {daftarTahunAjaran().map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <select
          value={filterBidang}
          onChange={(e) => {
            setFilterBidang(e.target.value);
            setPage(0);
          }}
          className={filterClass}
        >
          <option value="">Semua Bidang</option>
          {BIDANG_OPTIONS.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>

        <select
          value={filterTingkat}
          onChange={(e) => {
            setFilterTingkat(e.target.value);
            setPage(0);
          }}
          className={filterClass}
        >
          <option value="">Semua Tingkat</option>
          {TINGKAT_OPTIONS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        {!lockedToOwnClass && (
          <select
            value={filterRombel}
            onChange={(e) => {
              setFilterRombel(e.target.value);
              setPage(0);
            }}
            className={filterClass}
          >
            <option value="">Semua Kelas</option>
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

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40 text-left text-slate-500 dark:text-slate-400">
                <th className="px-4 py-3 font-medium w-12">No</th>
                <th className="px-4 py-3 font-medium">Siswa</th>
                <th className="px-4 py-3 font-medium">Kegiatan / Lomba</th>
                <th className="px-4 py-3 font-medium">Bidang</th>
                <th className="px-4 py-3 font-medium">Tingkat</th>
                <th className="px-4 py-3 font-medium">Peringkat</th>
                <th className="px-4 py-3 font-medium">Tahun Ajaran</th>
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
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500">
                    <Award className="h-6 w-6 mx-auto mb-2 text-slate-300" />
                    Belum ada data prestasi.
                  </td>
                </tr>
              ) : (
                data.map((row, idx) => (
                  <tr
                    key={row.id}
                    className="border-b border-slate-100 dark:border-slate-700/60 last:border-0 hover:bg-slate-50/60 dark:hover:bg-slate-700"
                  >
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{page * pageSize + idx + 1}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800 dark:text-slate-200">{row.siswa01?.nama ?? "-"}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{row.siswa01?.rombel ?? "-"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-800 dark:text-slate-200">{row.nama_kegiatan}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {[row.cabang, row.jenis].filter(Boolean).join(" · ")}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{row.bidang}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{row.tingkat}</td>
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{row.peringkat}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{row.tahun_ajaran}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {row.bukti_url && (
                          <a
                            href={row.bukti_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Buka bukti"
                            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                        {canEdit && (
                          <>
                            <button
                              onClick={() => openEdit(row)}
                              title="Ubah"
                              className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                setDeleteError(null);
                                setDeleteTarget(row);
                              }}
                              title="Hapus"
                              className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
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
              className="px-2 py-1 font-medium tracking-wide text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-40"
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
                    p === page + 1
                      ? "bg-indigo-600 text-white"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                  }`}
                >
                  {p}
                </button>
              )
            )}

            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-2 py-1 font-medium tracking-wide text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-40"
            >
              NEXT
            </button>
          </nav>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-2xl w-full shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                {editing ? "Ubah" : "Tambah"} Prestasi Siswa
              </h3>
              <button onClick={() => setShowForm(false)}>
                <X className="h-4 w-4 text-slate-400 dark:text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={labelClass}>Siswa</label>
                {siswaTerpilih ? (
                  <div className="flex items-center justify-between rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm">
                    <span className="text-slate-800 dark:text-slate-200">
                      <strong>{siswaTerpilih.nama}</strong> · {siswaTerpilih.rombel ?? "-"}
                      {siswaTerpilih.nisn ? ` · NISN ${siswaTerpilih.nisn}` : ""}
                    </span>
                    {!editing && (
                      <button
                        type="button"
                        onClick={() => {
                          setSiswaTerpilih(null);
                          setSiswaQuery("");
                          setSiswaHasil([]);
                        }}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        Ganti
                      </button>
                    )}
                  </div>
                ) : (
                  <div>
                    <input
                      value={siswaQuery}
                      onChange={(e) => setSiswaQuery(e.target.value)}
                      placeholder="Ketik minimal 2 huruf nama siswa..."
                      className={inputClass}
                      autoFocus
                    />
                    {siswaHasil.length > 0 && (
                      <ul className="mt-1 rounded-lg border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700 max-h-48 overflow-y-auto">
                        {siswaHasil.map((s) => (
                          <li key={s.id}>
                            <button
                              type="button"
                              onClick={() => setSiswaTerpilih(s)}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700"
                            >
                              <span className="font-medium text-slate-800 dark:text-slate-200">{s.nama}</span>
                              <span className="text-slate-500 dark:text-slate-400">
                                {" "}
                                · {s.rombel ?? "-"} {s.nisn ? `· ${s.nisn}` : ""}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Tahun Ajaran</label>
                  <input
                    value={form.tahun_ajaran}
                    onChange={(e) => setForm((f) => ({ ...f, tahun_ajaran: e.target.value }))}
                    placeholder="2025/2026"
                    required
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Tanggal Kegiatan</label>
                  <input
                    type="date"
                    value={form.tanggal}
                    onChange={(e) => setForm((f) => ({ ...f, tanggal: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Bidang</label>
                  <select
                    value={form.bidang}
                    onChange={(e) => setForm((f) => ({ ...f, bidang: e.target.value }))}
                    className={inputClass}
                  >
                    {BIDANG_OPTIONS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Cabang / Jenis Lomba</label>
                  <input
                    value={form.cabang}
                    onChange={(e) => setForm((f) => ({ ...f, cabang: e.target.value }))}
                    placeholder="mis. Olimpiade Matematika, Futsal"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Nama Kegiatan / Lomba</label>
                <input
                  value={form.nama_kegiatan}
                  onChange={(e) => setForm((f) => ({ ...f, nama_kegiatan: e.target.value }))}
                  required
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>Tingkat</label>
                  <select
                    value={form.tingkat}
                    onChange={(e) => setForm((f) => ({ ...f, tingkat: e.target.value }))}
                    className={inputClass}
                  >
                    {TINGKAT_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Individu / Tim</label>
                  <select
                    value={form.jenis}
                    onChange={(e) => setForm((f) => ({ ...f, jenis: e.target.value }))}
                    className={inputClass}
                  >
                    {JENIS_OPTIONS.map((j) => (
                      <option key={j} value={j}>
                        {j}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Peringkat</label>
                  <select
                    value={form.peringkat}
                    onChange={(e) => setForm((f) => ({ ...f, peringkat: e.target.value }))}
                    className={inputClass}
                  >
                    {PERINGKAT_OPTIONS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelClass}>Penyelenggara</label>
                <input
                  value={form.penyelenggara}
                  onChange={(e) => setForm((f) => ({ ...f, penyelenggara: e.target.value }))}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Link Bukti (sertifikat/dokumentasi)</label>
                <input
                  type="url"
                  value={form.bukti_url}
                  onChange={(e) => setForm((f) => ({ ...f, bukti_url: e.target.value }))}
                  placeholder="https://drive.google.com/..."
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Keterangan</label>
                <textarea
                  value={form.keterangan}
                  onChange={(e) => setForm((f) => ({ ...f, keterangan: e.target.value }))}
                  rows={2}
                  className={inputClass}
                />
              </div>

              {formError && (
                <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg px-3 py-2">
                  {formError}
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

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1.5">Hapus prestasi ini?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
              <span className="font-medium text-slate-700 dark:text-slate-200">{deleteTarget.nama_kegiatan}</span>{" "}
              ({deleteTarget.siswa01?.nama ?? "-"}) akan dihapus permanen.
            </p>
            {deleteError && (
              <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg px-3 py-2 mb-4">
                {deleteError}
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
                disabled={deleting}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 inline-flex items-center gap-2"
              >
                {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
