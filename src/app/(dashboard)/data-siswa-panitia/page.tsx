"use client";

import { useCallback, useEffect, useState } from "react";
import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/client";
import { compareKelas } from "@/lib/rekap-siswa";
import { getPageNumbers } from "@/lib/pagination";
import { getTahunAjaranSaatIni, getSemesterSaatIni } from "@/types/nilai";
import { ProfilSekolah } from "@/types/sekolah";
import { Search, Loader2, Users, Printer, Download } from "lucide-react";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

type SiswaRingkas = { id: string; nama: string | null; nisn: string | null; rombel: string | null };
type JenisDaftarHadir = "PTS" | "PAS";
type PrintGroup = { rombel: string; siswa: string[] };
type SiswaEkspor = { nama: string | null; nisn: string | null; rombel: string | null };

const JUDUL_DAFTAR_HADIR: Record<JenisDaftarHadir, string> = {
  PTS: "DAFTAR HADIR PENILAIAN TENGAH SEMESTER",
  PAS: "DAFTAR HADIR PENILAIAN AKHIR SEMESTER",
};

/** Excel tidak boleh ada nama sheet berisi : \ / ? * [ ] atau lebih dari 31 karakter. */
function sheetNameAman(nama: string): string {
  return nama.replace(/[:\\/?*[\]]/g, "-").slice(0, 31);
}

export default function DataSiswaPanitiaPage() {
  const [data, setData] = useState<SiswaRingkas[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [search, setSearch] = useState("");
  const [filterRombel, setFilterRombel] = useState("");
  const [rombelOptions, setRombelOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [profil, setProfil] = useState<ProfilSekolah | null>(null);
  const [tahunAjaran, setTahunAjaran] = useState(getTahunAjaranSaatIni());
  const [semester, setSemester] = useState<"Ganjil" | "Genap">(getSemesterSaatIni());
  const [printJenis, setPrintJenis] = useState<JenisDaftarHadir | null>(null);
  const [printGroups, setPrintGroups] = useState<PrintGroup[]>([]);
  const [printLoading, setPrintLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRombelOptions() {
      const supabase = createClient();
      const { data } = await supabase
        .from("siswa01")
        .select("rombel")
        .eq("status_siswa", "Aktif")
        .not("rombel", "is", null);
      const unique = Array.from(new Set((data ?? []).map((r) => r.rombel).filter(Boolean) as string[])).sort(
        compareKelas
      );
      setRombelOptions(unique);
    }
    fetchRombelOptions();
  }, []);

  useEffect(() => {
    async function fetchProfilDanPeriode() {
      const supabase = createClient();
      const [{ data: profilData }, { data: periodeData }] = await Promise.all([
        supabase.from("profil_sekolah").select("*").eq("id", 1).maybeSingle(),
        supabase.from("pengaturan_akademik").select("tahun_ajaran, semester").eq("id", 1).maybeSingle(),
      ]);
      if (profilData) setProfil(profilData);
      if (periodeData) {
        setTahunAjaran(periodeData.tahun_ajaran);
        setSemester(periodeData.semester);
      }
    }
    fetchProfilDanPeriode();
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    let query = supabase
      .from("siswa01")
      .select("id, nama, nisn, rombel", { count: "exact" })
      .eq("status_siswa", "Aktif")
      .order("nama", { ascending: true })
      .range(page * pageSize, page * pageSize + pageSize - 1);

    if (search.trim()) {
      query = query.or(`nama.ilike.%${search}%,nisn.ilike.%${search}%`);
    }
    if (filterRombel) query = query.eq("rombel", filterRombel);

    const { data, count, error } = await query;

    if (!error) {
      setData(data ?? []);
      setTotal(count ?? 0);
    }
    setLoading(false);
  }, [page, pageSize, search, filterRombel]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handlePrint(jenis: JenisDaftarHadir) {
    setPrintLoading(true);
    const supabase = createClient();

    let query = supabase
      .from("siswa01")
      .select("nama, rombel")
      .eq("status_siswa", "Aktif")
      .order("nama", { ascending: true });
    if (filterRombel) query = query.eq("rombel", filterRombel);

    const { data: siswaData } = await query;

    const byRombel = new Map<string, string[]>();
    for (const s of siswaData ?? []) {
      const r = s.rombel ?? "-";
      if (!byRombel.has(r)) byRombel.set(r, []);
      byRombel.get(r)!.push(s.nama ?? "-");
    }
    const groups = Array.from(byRombel.keys())
      .sort(compareKelas)
      .map((r) => ({ rombel: r, siswa: byRombel.get(r)! }));

    setPrintGroups(groups);
    setPrintJenis(jenis);
    setPrintLoading(false);

    setTimeout(() => window.print(), 400);
  }

  function tambahSheet(workbook: ExcelJS.Workbook, namaKelas: string, siswaList: SiswaEkspor[]) {
    const sheet = workbook.addWorksheet(sheetNameAman(namaKelas));
    sheet.columns = [
      { key: "no", width: 6 },
      { key: "nisn", width: 18 },
      { key: "nama", width: 32 },
    ];

    sheet.mergeCells(1, 1, 1, 3);
    const titleCell = sheet.getCell(1, 1);
    titleCell.value = `DATA SISWA - Kelas ${namaKelas}`;
    titleCell.font = { bold: true, size: 12 };
    titleCell.alignment = { horizontal: "left", vertical: "middle" };

    const headerRow = sheet.getRow(3);
    ["No", "NISN", "Nama"].forEach((h, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = h;
      cell.font = { bold: true };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF9C4" } };
    });

    siswaList.forEach((s, idx) => {
      const row = sheet.getRow(4 + idx);
      row.getCell(1).value = idx + 1;
      row.getCell(2).value = s.nisn || "";
      row.getCell(3).value = s.nama || "";
    });

    const barisTerakhir = 3 + siswaList.length;
    const border: Partial<ExcelJS.Borders> = {
      top: { style: "thin", color: { argb: "FF000000" } },
      left: { style: "thin", color: { argb: "FF000000" } },
      bottom: { style: "thin", color: { argb: "FF000000" } },
      right: { style: "thin", color: { argb: "FF000000" } },
    };
    for (let r = 3; r <= barisTerakhir; r++) {
      for (let c = 1; c <= 3; c++) {
        sheet.getRow(r).getCell(c).border = border;
      }
    }
  }

  async function handleExport() {
    setExporting(true);
    setExportError(null);
    const supabase = createClient();

    let query = supabase
      .from("siswa01")
      .select("nama, nisn, rombel")
      .eq("status_siswa", "Aktif")
      .order("nama", { ascending: true });
    if (filterRombel) query = query.eq("rombel", filterRombel);

    const { data: allData, error: fetchError } = await query;

    if (fetchError) {
      setExporting(false);
      setExportError(fetchError.message);
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const grouped = new Map<string, SiswaEkspor[]>();
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
    a.download = filterRombel
      ? `Data-Siswa-${sheetNameAman(filterRombel)}.xlsx`
      : "Data-Siswa-Semua-Kelas.xlsx";
    a.click();
    URL.revokeObjectURL(url);

    setExporting(false);
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const alamatLine = [profil?.alamat, profil?.kelurahan ? `Kel. ${profil.kelurahan}` : "", profil?.kecamatan ? `Kec. ${profil.kecamatan}` : ""]
    .filter(Boolean)
    .join(" ");
  const kotaLine = [profil?.kota_kabupaten, profil?.kode_pos].filter(Boolean).join(" ");

  return (
    <>
      <div className="p-6 md:p-8 dark:bg-slate-900 print:hidden">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Data Siswa</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{total} siswa aktif terdaftar</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              disabled={exporting}
              className="inline-flex items-center gap-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-60"
            >
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Export Excel
            </button>
            <button
              onClick={() => handlePrint("PTS")}
              disabled={printLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-60"
            >
              {printLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
              Cetak Daftar Hadir PTS
            </button>
            <button
              onClick={() => handlePrint("PAS")}
              disabled={printLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-60"
            >
              {printLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
              Cetak Daftar Hadir PAS
            </button>
          </div>
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
              placeholder="Cari nama atau NISN..."
              className="w-full sm:w-72 rounded-lg border border-slate-300 dark:border-slate-600 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <select
            value={filterRombel}
            onChange={(e) => {
              setFilterRombel(e.target.value);
              setPage(0);
            }}
            className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">Semua Kelas</option>
            {rombelOptions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">
          Tombol cetak &amp; export mengikuti filter Kelas di atas -- pilih satu kelas untuk cetak/export
          satu kelas, atau biarkan &quot;Semua Kelas&quot; untuk semua kelas sekaligus (satu lembar/sheet
          per kelas).
        </p>

        {exportError && (
          <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg px-3 py-2 mb-4">
            {exportError}
          </p>
        )}

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40 text-left text-slate-500 dark:text-slate-400">
                  <th className="px-4 py-3 font-medium w-12">No</th>
                  <th className="px-4 py-3 font-medium">NISN</th>
                  <th className="px-4 py-3 font-medium">Nama</th>
                  <th className="px-4 py-3 font-medium">Kelas</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500">
                      <Users className="h-6 w-6 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                      Belum ada data siswa yang cocok.
                    </td>
                  </tr>
                ) : (
                  data.map((s, idx) => (
                    <tr key={s.id} className="border-b border-slate-100 dark:border-slate-700/60 last:border-0 hover:bg-slate-50/60 dark:hover:bg-slate-700/60">
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{page * pageSize + idx + 1}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{s.nisn || "-"}</td>
                      <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{s.nama || "-"}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{s.rombel || "-"}</td>
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
                className="px-2 py-1 font-medium tracking-wide text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-40 disabled:hover:text-slate-500 dark:disabled:hover:text-slate-400"
              >
                NEXT
              </button>
            </nav>
          </div>
        </div>
      </div>

      {printJenis && (
        <div className="hidden print:block">
          {printGroups.map((group, gIdx) => (
            <div key={group.rombel} className={gIdx < printGroups.length - 1 ? "break-after-page" : ""}>
              <div className="flex items-center justify-center gap-4 mb-2">
                <div className="w-20 h-20 shrink-0">
                  {/* <img> biasa (bukan next/image) sengaja dipakai -- elemen ini di dalam
                      blok "hidden print:block", jadi next/image lazy-load-nya
                      (berbasis IntersectionObserver) tidak pernah terpicu selama
                      display:none dan logo gagal termuat saat mode cetak diaktifkan. */}
                  {profil?.logo_sekolah_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profil.logo_sekolah_url} alt="Logo Sekolah" className="h-20 w-20 object-contain" />
                  )}
                </div>
                <div className="flex-1 text-center text-black">
                  {profil?.header_baris1 && <p className="text-sm font-semibold uppercase">{profil.header_baris1}</p>}
                  {profil?.header_baris2 && <p className="text-sm font-semibold uppercase">{profil.header_baris2}</p>}
                  <p className="text-xl font-bold uppercase">{profil?.nama_sekolah}</p>
                  {alamatLine && <p className="text-xs">{alamatLine}</p>}
                  {(profil?.website || profil?.email) && (
                    <p className="text-xs">
                      {profil?.website && `Website : ${profil.website}`}
                      {profil?.website && profil?.email && "     "}
                      {profil?.email && `email: ${profil.email}`}
                    </p>
                  )}
                  {kotaLine && <p className="text-xs uppercase">{kotaLine}</p>}
                </div>
                <div className="w-20 shrink-0" />
              </div>
              <hr className="border-t-2 border-black mb-4" />

              <div className="text-center mb-4">
                <p className="text-sm font-bold uppercase">{JUDUL_DAFTAR_HADIR[printJenis]}</p>
                <p className="text-sm">
                  TAHUN AJARAN : {tahunAjaran}&nbsp;&nbsp;&nbsp;SEMESTER : {semester}&nbsp;&nbsp;&nbsp;KELAS :{" "}
                  {group.rombel}
                </p>
              </div>

              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr>
                    <th className="border border-black px-2 py-1.5 w-10">No</th>
                    <th className="border border-black px-2 py-1.5">Nama</th>
                    <th className="border border-black px-2 py-1.5">Tanda Tangan</th>
                  </tr>
                </thead>
                <tbody>
                  {group.siswa.map((nama, idx) => (
                    <tr key={idx}>
                      <td className="border border-black px-2 py-1.5 text-center">{idx + 1}</td>
                      <td className="border border-black px-2 py-1.5">{nama}</td>
                      <td className="border border-black px-2 py-1.5">{idx + 1}.</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
