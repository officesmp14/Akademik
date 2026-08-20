"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useModulePermission, useRole } from "@/lib/role-context";
import { getPageNumbers } from "@/lib/pagination";
import { compareKelas } from "@/lib/rekap-siswa";
import { Siswa } from "@/types/siswa";
import ExcelJS from "exceljs";
import { Pencil, Loader2, X, ClipboardList, Search, Download } from "lucide-react";

const EXPORT_KOLOM = [
  { header: "No", key: "no", width: 3 },
  { header: "Nama", key: "nama", width: 30 },
  { header: "NISN", key: "nisn", width: 12 },
  { header: "Jenis Pendaftaran", key: "jenis_pendaftaran", width: 20 },
  { header: "Tanggal Masuk Sekolah", key: "tanggal_masuk_sekolah", width: 20 },
  { header: "Nomor Induk", key: "nipd", width: 14 },
  { header: "Sekolah Asal", key: "sekolah_asal", width: 33 },
  { header: "Hobi", key: "hobi", width: 9 },
  { header: "Cita-cita", key: "cita_cita", width: 9 },
  { header: "No Peserta Ujian", key: "no_peserta_un", width: 21 },
  { header: "No Seri Ijazah", key: "no_seri_ijazah", width: 23 },
];

function sheetNameAman(nama: string): string {
  return nama.replace(/[:\\/?*[\]]/g, "-").slice(0, 31);
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

type RefOption = { kode: number; uraian: string };

type EditForm = {
  jenis_pendaftaran_id: string;
  tanggal_masuk_sekolah: string;
  nipd: string;
  sekolah_asal: string;
  no_peserta_un: string;
  no_seri_ijazah: string;
  id_hobby: string;
  id_cita: string;
};

const emptyEditForm: EditForm = {
  jenis_pendaftaran_id: "",
  tanggal_masuk_sekolah: "",
  nipd: "",
  sekolah_asal: "",
  no_peserta_un: "",
  no_seri_ijazah: "",
  id_hobby: "",
  id_cita: "",
};

export default function RegistrasiPesertaDidikPage() {
  const { canEdit: canEditModule } = useModulePermission("siswa");
  const { role, waliKelasRombel } = useRole();
  const isFullAccessRole = role === "admin" || role === "kepala_sekolah";
  const lockedToOwnClass = !isFullAccessRole && Boolean(waliKelasRombel);
  const canEdit = canEditModule || lockedToOwnClass;

  const [data, setData] = useState<Siswa[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [jenisPendaftaranOptions, setJenisPendaftaranOptions] = useState<RefOption[]>([]);
  const [hobiOptions, setHobiOptions] = useState<RefOption[]>([]);
  const [citaOptions, setCitaOptions] = useState<RefOption[]>([]);

  const [search, setSearch] = useState("");
  const [filterRombel, setFilterRombel] = useState("");
  const [rombelOptions, setRombelOptions] = useState<string[]>([]);

  const [editTarget, setEditTarget] = useState<Siswa | null>(null);
  const [editForm, setEditForm] = useState<EditForm>(emptyEditForm);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Ambil daftar referensi sekali saat halaman dibuka
  useEffect(() => {
    async function fetchRefOptions() {
      const supabase = createClient();
      const [jenisRes, hobiRes, citaRes] = await Promise.all([
        supabase.from("ref_jenis_pendaftaran").select("kode, uraian").order("kode"),
        supabase.from("ref_hobi").select("kode, uraian").order("kode"),
        supabase.from("ref_cita_cita").select("kode, uraian").order("kode"),
      ]);
      setJenisPendaftaranOptions(jenisRes.data ?? []);
      setHobiOptions(hobiRes.data ?? []);
      setCitaOptions(citaRes.data ?? []);
    }
    fetchRefOptions();
  }, []);

  // Ambil daftar rombel unik (dari siswa aktif) untuk isi dropdown filter
  useEffect(() => {
    if (lockedToOwnClass) return;
    async function fetchRombelOptions() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("siswa01")
        .select("rombel")
        .eq("status_siswa", "Aktif")
        .not("rombel", "is", null);

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
        "id, nisn, nama, nipd, rombel, jenis_pendaftaran_id, id_hobby, id_cita, tanggal_masuk_sekolah, sekolah_asal, no_peserta_un, no_seri_ijazah",
        { count: "exact" }
      )
      .eq("status_siswa", "Aktif")
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

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function uraianOf(options: RefOption[], kode: number | null | undefined) {
    if (kode === null || kode === undefined) return "-";
    return options.find((o) => o.kode === kode)?.uraian ?? "-";
  }

  function openEdit(row: Siswa) {
    setEditTarget(row);
    setEditForm({
      jenis_pendaftaran_id: row.jenis_pendaftaran_id != null ? String(row.jenis_pendaftaran_id) : "",
      tanggal_masuk_sekolah: row.tanggal_masuk_sekolah ?? "",
      nipd: row.nipd ?? "",
      sekolah_asal: row.sekolah_asal ?? "",
      no_peserta_un: row.no_peserta_un ?? "",
      no_seri_ijazah: row.no_seri_ijazah ?? "",
      id_hobby: row.id_hobby != null ? String(row.id_hobby) : "",
      id_cita: row.id_cita != null ? String(row.id_cita) : "",
    });
    setErrorMsg(null);
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget?.id) return;

    setSaving(true);
    setErrorMsg(null);
    const supabase = createClient();

    const payload = {
      jenis_pendaftaran_id: editForm.jenis_pendaftaran_id ? Number(editForm.jenis_pendaftaran_id) : null,
      tanggal_masuk_sekolah: editForm.tanggal_masuk_sekolah || null,
      nipd: editForm.nipd || null,
      sekolah_asal: editForm.sekolah_asal || null,
      no_peserta_un: editForm.no_peserta_un || null,
      no_seri_ijazah: editForm.no_seri_ijazah || null,
      id_hobby: editForm.id_hobby ? Number(editForm.id_hobby) : null,
      id_cita: editForm.id_cita ? Number(editForm.id_cita) : null,
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

  function buildExportRow(s: Siswa, no: number) {
    return {
      no,
      nama: s.nama || "-",
      nisn: s.nisn || "-",
      jenis_pendaftaran: s.jenis_pendaftaran_id ?? "-",
      tanggal_masuk_sekolah: s.tanggal_masuk_sekolah || "",
      nipd: s.nipd || "-",
      sekolah_asal: s.sekolah_asal || "-",
      hobi: s.id_hobby ?? -1,
      cita_cita: s.id_cita ?? -1,
      no_peserta_un: s.no_peserta_un || "",
      no_seri_ijazah: s.no_seri_ijazah || "",
    };
  }

  function tambahSheet(workbook: ExcelJS.Workbook, namaKelas: string, siswaList: Siswa[]) {
    const sheet = workbook.addWorksheet(sheetNameAman(namaKelas));
    sheet.columns = EXPORT_KOLOM.map((k) => ({ key: k.key, width: k.width }));

    // Baris 1: judul, digabung A1:K1
    sheet.mergeCells(1, 1, 1, EXPORT_KOLOM.length);
    const titleCell = sheet.getCell(1, 1);
    titleCell.value = `DATA REGISTRASI PESERTA DIDIK - Kelas ${namaKelas}`;
    titleCell.font = { bold: true, size: 12 };
    titleCell.alignment = { horizontal: "left", vertical: "middle" };

    // Baris 3: header kolom
    const headerRow = sheet.getRow(3);
    EXPORT_KOLOM.forEach((k, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = k.header;
      cell.font = { bold: true };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF9C4" } };
    });

    // Baris 4 dst: data
    siswaList.forEach((s, idx) => {
      const row = sheet.getRow(4 + idx);
      const values = buildExportRow(s, idx + 1);
      EXPORT_KOLOM.forEach((k, i) => {
        row.getCell(i + 1).value = values[k.key as keyof typeof values];
      });
    });

    // Border dari A3 sampai baris data terakhir
    const barisTerakhir = 3 + siswaList.length;
    const border: Partial<ExcelJS.Borders> = {
      top: { style: "thin", color: { argb: "FF000000" } },
      left: { style: "thin", color: { argb: "FF000000" } },
      bottom: { style: "thin", color: { argb: "FF000000" } },
      right: { style: "thin", color: { argb: "FF000000" } },
    };
    for (let r = 3; r <= barisTerakhir; r++) {
      for (let c = 1; c <= EXPORT_KOLOM.length; c++) {
        sheet.getRow(r).getCell(c).border = border;
      }
    }
  }

  async function handleExport() {
    setExporting(true);
    setError(null);
    const supabase = createClient();

    let query = supabase
      .from("siswa01")
      .select(
        "id, nisn, nama, nipd, rombel, jenis_pendaftaran_id, id_hobby, id_cita, tanggal_masuk_sekolah, sekolah_asal, no_peserta_un, no_seri_ijazah"
      )
      .eq("status_siswa", "Aktif")
      .order("nama", { ascending: true });

    if (search.trim()) {
      query = query.or(
        `nama.ilike.%${search}%,nisn.ilike.%${search}%,nipd.ilike.%${search}%`
      );
    }
    const effectiveRombel = lockedToOwnClass ? waliKelasRombel : filterRombel;
    if (effectiveRombel) query = query.eq("rombel", effectiveRombel);

    const { data: allData, error: fetchError } = await query;

    if (fetchError) {
      setExporting(false);
      setError(fetchError.message);
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const grouped = new Map<string, Siswa[]>();
    for (const s of allData ?? []) {
      const kelas = s.rombel || "Tanpa Rombel";
      if (!grouped.has(kelas)) grouped.set(kelas, []);
      grouped.get(kelas)!.push(s);
    }

    const sortedKelas = Array.from(grouped.keys()).sort(compareKelas);
    for (const kelas of sortedKelas) {
      tambahSheet(workbook, kelas, grouped.get(kelas)!);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = effectiveRombel
      ? `Registrasi-Peserta-Didik-${sheetNameAman(effectiveRombel)}.xlsx`
      : "Registrasi-Peserta-Didik-Semua-Kelas.xlsx";
    a.click();
    URL.revokeObjectURL(url);

    setExporting(false);
  }

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Registrasi Peserta Didik</h1>
          <p className="text-sm text-slate-500 mt-1">
            {lockedToOwnClass && (
              <>
                Wali Kelas <strong>{waliKelasRombel}</strong> &middot;{" "}
              </>
            )}
            {total} siswa terdaftar
          </p>
        </div>
        {!lockedToOwnClass && (
          <button
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex items-center gap-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium px-4 py-2 hover:bg-slate-50 transition-colors disabled:opacity-50 shrink-0"
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Export Excel
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <select
          value={pageSize}
          onChange={(e) => {
            setPageSize(Number(e.target.value));
            setPage(0);
          }}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          {PAGE_SIZE_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n} / halaman
            </option>
          ))}
        </select>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Cari nama, NISN, atau NIPD..."
            className="w-full sm:w-72 rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        {!lockedToOwnClass && (
          <select
            value={filterRombel}
            onChange={(e) => {
              setFilterRombel(e.target.value);
              setPage(0);
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                <th className="px-4 py-3 font-medium">NISN</th>
                <th className="px-4 py-3 font-medium">Nama Siswa</th>
                <th className="px-4 py-3 font-medium">Kelas</th>
                <th className="px-4 py-3 font-medium">Nomor Induk</th>
                <th className="px-4 py-3 font-medium">Pendaftaran</th>
                <th className="px-4 py-3 font-medium">Hobi</th>
                <th className="px-4 py-3 font-medium">Cita-cita</th>
                {canEdit && <th className="px-4 py-3 font-medium text-right">Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={canEdit ? 9 : 8} className="px-4 py-10 text-center text-slate-400">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 9 : 8} className="px-4 py-10 text-center text-slate-400">
                    <ClipboardList className="h-6 w-6 mx-auto mb-2 text-slate-300" />
                    Belum ada data siswa.
                  </td>
                </tr>
              ) : (
                data.map((row, idx) => (
                  <tr key={row.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                    <td className="px-4 py-3 text-slate-500">{page * pageSize + idx + 1}</td>
                    <td className="px-4 py-3 text-slate-600">{row.nisn || "-"}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{row.nama || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{row.rombel || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{row.nipd || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {uraianOf(jenisPendaftaranOptions, row.jenis_pendaftaran_id)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{uraianOf(hobiOptions, row.id_hobby)}</td>
                    <td className="px-4 py-3 text-slate-600">{uraianOf(citaOptions, row.id_cita)}</td>
                    {canEdit && (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(row)}
                            title="Edit"
                            className="p-2 rounded-lg text-slate-500 hover:bg-indigo-50 hover:text-indigo-600"
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

        <div className="flex items-center justify-end px-4 py-3 border-t border-slate-200">
          <nav className="flex items-center gap-1 text-sm">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-2 py-1 font-medium tracking-wide text-slate-500 hover:text-slate-800 disabled:opacity-40 disabled:hover:text-slate-500"
            >
              PREVIOUS
            </button>

            {getPageNumbers(page + 1, totalPages).map((p, i) =>
              p === "..." ? (
                <span key={`ellipsis-${i}`} className="px-1.5 text-slate-400 select-none">
                  ...
                </span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p - 1)}
                  className={`h-7 w-7 rounded-full text-sm font-medium transition-colors ${
                    p === page + 1 ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {p}
                </button>
              )
            )}

            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-2 py-1 font-medium tracking-wide text-slate-500 hover:text-slate-800 disabled:opacity-40 disabled:hover:text-slate-500"
            >
              NEXT
            </button>
          </nav>
        </div>
      </div>

      {editTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-slate-900">{editTarget.nama || "-"}</h3>
              <button onClick={() => setEditTarget(null)}>
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Jenis Pendaftaran:
                  </label>
                  <select
                    value={editForm.jenis_pendaftaran_id}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, jenis_pendaftaran_id: e.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">(belum diisi)</option>
                    {jenisPendaftaranOptions.map((o) => (
                      <option key={o.kode} value={o.kode}>
                        {o.uraian}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Tanggal Masuk Sekolah:
                  </label>
                  <input
                    type="date"
                    value={editForm.tanggal_masuk_sekolah}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, tanggal_masuk_sekolah: e.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Nomor Induk:
                  </label>
                  <input
                    type="text"
                    value={editForm.nipd}
                    onChange={(e) => setEditForm((f) => ({ ...f, nipd: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Sekolah Asal:
                  </label>
                  <input
                    type="text"
                    value={editForm.sekolah_asal}
                    onChange={(e) => setEditForm((f) => ({ ...f, sekolah_asal: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Nomor Peserta UN:
                  </label>
                  <input
                    type="text"
                    value={editForm.no_peserta_un}
                    onChange={(e) => setEditForm((f) => ({ ...f, no_peserta_un: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Nomor Seri Ijazah:
                  </label>
                  <input
                    type="text"
                    value={editForm.no_seri_ijazah}
                    onChange={(e) => setEditForm((f) => ({ ...f, no_seri_ijazah: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Hobi:</label>
                  <select
                    value={editForm.id_hobby}
                    onChange={(e) => setEditForm((f) => ({ ...f, id_hobby: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">(belum diisi)</option>
                    {hobiOptions.map((o) => (
                      <option key={o.kode} value={o.kode}>
                        {o.uraian}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Cita-cita:
                  </label>
                  <select
                    value={editForm.id_cita}
                    onChange={(e) => setEditForm((f) => ({ ...f, id_cita: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">(belum diisi)</option>
                    {citaOptions.map((o) => (
                      <option key={o.kode} value={o.kode}>
                        {o.uraian}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {errorMsg && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {errorMsg}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditTarget(null)}
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
