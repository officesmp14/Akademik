"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useModulePermission, useRole } from "@/lib/role-context";
import { getPageNumbers } from "@/lib/pagination";
import { compareKelas } from "@/lib/rekap-siswa";
import { Siswa } from "@/types/siswa";
import ExcelJS from "exceljs";
import { Pencil, Loader2, X, Ruler, Search, Download } from "lucide-react";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const EXPORT_KOLOM = [
  { header: "No", key: "no", width: 5 },
  { header: "Nama", key: "nama", width: 30 },
  { header: "NISN", key: "nisn", width: 15 },
  { header: "Tinggi Badan", key: "tinggi_badan", width: 12 },
  { header: "Berat Badan", key: "berat_badan", width: 12 },
  { header: "Lingkar Kepala", key: "lingkar_kepala", width: 15 },
  { header: "Jumlah Saudara Kandung", key: "jml_saudara", width: 20 },
  { header: "Jarak Rumah ke Sekolah", key: "jarak_rumah", width: 20 },
  { header: "Jarak Rumah ke Sekolah (km)", key: "jarak_rumah_km", width: 22 },
  { header: "Waktu Tempuh ke Sekolah (Jam)", key: "jarak_tempuh_jam", width: 22 },
  { header: "Menit Tempuh ke Sekolah", key: "jarak_tempuh", width: 20 },
];

function sheetNameAman(nama: string): string {
  return nama.replace(/[:\\/?*[\]]/g, "-").slice(0, 31);
}

/** Hanya izinkan digit angka, opsional batasi jumlah digitnya. */
function digitsOnly(value: string, maxLength?: number): string {
  const digits = value.replace(/\D/g, "");
  return maxLength ? digits.slice(0, maxLength) : digits;
}

type EditForm = {
  tinggi_badan: string;
  berat_badan: string;
  lingkar_kepala: string;
  jml_saudara: string;
  jarak_rumah: string;
  jarak_rumah_km: string;
  jarak_tempuh_jam: string;
  jarak_tempuh: string;
};

const emptyEditForm: EditForm = {
  tinggi_badan: "",
  berat_badan: "",
  lingkar_kepala: "",
  jml_saudara: "",
  jarak_rumah: "",
  jarak_rumah_km: "",
  jarak_tempuh_jam: "",
  jarak_tempuh: "",
};

export default function DataPeriodikPage() {
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

  const [search, setSearch] = useState("");
  const [filterRombel, setFilterRombel] = useState("");
  const [rombelOptions, setRombelOptions] = useState<string[]>([]);

  const [editTarget, setEditTarget] = useState<Siswa | null>(null);
  const [editForm, setEditForm] = useState<EditForm>(emptyEditForm);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (lockedToOwnClass) return;
    async function fetchRombelOptions() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("siswa01")
        .select("rombel")
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
        "id, nisn, nama, rombel, tinggi_badan, berat_badan, lingkar_kepala, jml_saudara, jarak_rumah, jarak_rumah_km, jarak_tempuh, jarak_tempuh_jam",
        { count: "exact" }
      )
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

  function openEdit(row: Siswa) {
    setEditTarget(row);
    setEditForm({
      tinggi_badan: row.tinggi_badan ?? "",
      berat_badan: row.berat_badan ?? "",
      lingkar_kepala: row.lingkar_kepala ?? "",
      jml_saudara: row.jml_saudara ?? "",
      jarak_rumah: row.jarak_rumah ?? "Kurang 1 km",
      jarak_rumah_km: row.jarak_rumah_km ?? "",
      jarak_tempuh_jam: row.jarak_tempuh_jam ?? "",
      jarak_tempuh: row.jarak_tempuh ?? "",
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
      tinggi_badan: editForm.tinggi_badan || null,
      berat_badan: editForm.berat_badan || null,
      lingkar_kepala: editForm.lingkar_kepala || null,
      jml_saudara: editForm.jml_saudara || null,
      jarak_rumah: editForm.jarak_rumah || null,
      jarak_rumah_km: editForm.jarak_rumah === "Lebih 1 km" ? editForm.jarak_rumah_km || null : null,
      jarak_tempuh_jam: editForm.jarak_tempuh_jam || null,
      jarak_tempuh: editForm.jarak_tempuh || null,
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

  function jarakRumahKode(jarakRumah: string | null | undefined) {
    if (jarakRumah === "Kurang 1 km") return 1;
    if (jarakRumah === "Lebih 1 km") return 2;
    return "";
  }

  function buildExportRow(s: Siswa, no: number) {
    return {
      no,
      nama: s.nama || "-",
      nisn: s.nisn || "-",
      tinggi_badan: s.tinggi_badan || "",
      berat_badan: s.berat_badan || "",
      lingkar_kepala: s.lingkar_kepala || "",
      jml_saudara: s.jml_saudara || "",
      jarak_rumah: jarakRumahKode(s.jarak_rumah),
      jarak_rumah_km: s.jarak_rumah_km || "",
      jarak_tempuh_jam: s.jarak_tempuh_jam || "",
      jarak_tempuh: s.jarak_tempuh || "",
    };
  }

  function tambahSheet(workbook: ExcelJS.Workbook, namaKelas: string, siswaList: Siswa[]) {
    const sheet = workbook.addWorksheet(sheetNameAman(namaKelas));
    sheet.columns = EXPORT_KOLOM.map((k) => ({ header: k.header, key: k.key, width: k.width }));

    const headerRow = sheet.getRow(1);
    headerRow.height = 20;
    headerRow.eachCell((cell) => {
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF9C4" } };
      cell.font = { bold: true };
    });

    siswaList.forEach((s, idx) => {
      sheet.addRow(buildExportRow(s, idx + 1));
    });

    const barisTerakhir = 1 + siswaList.length;
    const border: Partial<ExcelJS.Borders> = {
      top: { style: "thin", color: { argb: "FF000000" } },
      left: { style: "thin", color: { argb: "FF000000" } },
      bottom: { style: "thin", color: { argb: "FF000000" } },
      right: { style: "thin", color: { argb: "FF000000" } },
    };
    for (let r = 1; r <= barisTerakhir; r++) {
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
        "id, nisn, nama, rombel, tinggi_badan, berat_badan, lingkar_kepala, jml_saudara, jarak_rumah, jarak_rumah_km, jarak_tempuh, jarak_tempuh_jam"
      )
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
      ? `Data-Periodik-${sheetNameAman(effectiveRombel)}.xlsx`
      : "Data-Periodik-Semua-Kelas.xlsx";
    a.click();
    URL.revokeObjectURL(url);

    setExporting(false);
  }

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Data Periodik</h1>
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
                <th className="px-4 py-3 font-medium">Tinggi</th>
                <th className="px-4 py-3 font-medium">Berat</th>
                <th className="px-4 py-3 font-medium">Lingkar Kepala</th>
                <th className="px-4 py-3 font-medium">Saudara Kandung</th>
                <th className="px-4 py-3 font-medium">Jam</th>
                <th className="px-4 py-3 font-medium">Menit</th>
                {canEdit && <th className="px-4 py-3 font-medium text-right">Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={canEdit ? 10 : 9} className="px-4 py-10 text-center text-slate-400">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 10 : 9} className="px-4 py-10 text-center text-slate-400">
                    <Ruler className="h-6 w-6 mx-auto mb-2 text-slate-300" />
                    Belum ada data siswa.
                  </td>
                </tr>
              ) : (
                data.map((row, idx) => (
                  <tr key={row.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                    <td className="px-4 py-3 text-slate-500">{page * pageSize + idx + 1}</td>
                    <td className="px-4 py-3 text-slate-600">{row.nisn || "-"}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{row.nama || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{row.tinggi_badan || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{row.berat_badan || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{row.lingkar_kepala || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{row.jml_saudara || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{row.jarak_tempuh_jam || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{row.jarak_tempuh || "-"}</td>
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
                    Tinggi Badan:
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={editForm.tinggi_badan}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, tinggi_badan: digitsOnly(e.target.value) }))
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Berat Badan:
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={editForm.berat_badan}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, berat_badan: digitsOnly(e.target.value) }))
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Lingkar Kepala:
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={editForm.lingkar_kepala}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, lingkar_kepala: digitsOnly(e.target.value) }))
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Saudara Kandung:
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={editForm.jml_saudara}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, jml_saudara: digitsOnly(e.target.value) }))
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Jarak Rumah ke sekolah:
                  </label>
                  <div className="flex items-center gap-4 h-[38px]">
                    {["Kurang 1 km", "Lebih 1 km"].map((opt) => (
                      <label key={opt} className="flex items-center gap-1.5 text-sm text-slate-700 cursor-pointer">
                        <input
                          type="radio"
                          name="jarak_rumah"
                          checked={editForm.jarak_rumah === opt}
                          onChange={() => setEditForm((f) => ({ ...f, jarak_rumah: opt }))}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Sebutkan dalam (km):
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={2}
                    disabled={editForm.jarak_rumah !== "Lebih 1 km"}
                    value={editForm.jarak_rumah_km}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, jarak_rumah_km: digitsOnly(e.target.value, 2) }))
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Waktu/ Jam:
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={editForm.jarak_tempuh_jam}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, jarak_tempuh_jam: digitsOnly(e.target.value) }))
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Waktu/ Menit:
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={editForm.jarak_tempuh}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, jarak_tempuh: digitsOnly(e.target.value) }))
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
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
