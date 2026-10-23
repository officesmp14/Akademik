"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/client";
import { useModulePermission, useRole } from "@/lib/role-context";
import { getPageNumbers } from "@/lib/pagination";
import { Download, Loader2, Search, Upload, Wallet } from "lucide-react";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

type PipRow = {
  id: string;
  nisn: string;
  nik: string | null;
  nama: string;
  jk: string | null;
  tempat_lahir: string | null;
  tanggal_lahir: string | null;
  nama_ibu: string | null;
  pekerjaan_ibu: string | null;
  penghasilan_ibu: string | null;
  nama_ayah: string | null;
  pekerjaan_ayah: string | null;
  penghasilan_ayah: string | null;
  nama_wali: string | null;
  pekerjaan_wali: string | null;
  penghasilan_wali: string | null;
  telepon: string | null;
  kelas: string | null;
  nominal_id: string | null;
  desil: string | null;
  bank: string | null;
  status_tabunganku: string | null;
  terseleksi: boolean;
  kelas_seleksi: string | null;
  alasan: string | null;
};

const bersih = (v: unknown): string | null => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
};

function parseTanggal(v: unknown): string | null {
  const s = bersih(v);
  if (!s) return null;
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(s);
  return m ? m[1] : null;
}

export default function DataPipPage() {
  const { canEdit: canEditModule } = useModulePermission("data_pip");
  const { role } = useRole();
  const canEdit = role === "admin" || role === "kepala_sekolah" || canEditModule;

  const [data, setData] = useState<PipRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filterKelas, setFilterKelas] = useState("");
  const [filterDesil, setFilterDesil] = useState("");
  const [filterNominal, setFilterNominal] = useState("");
  const [filterSeleksi, setFilterSeleksi] = useState("");

  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [pesan, setPesan] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const terapkanFilter = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (query: any) => {
      if (search.trim()) {
        const q = search.trim().replace(/[,%]/g, " ");
        query = query.or(`nama.ilike.%${q}%,nisn.ilike.%${q}%,nik.ilike.%${q}%`);
      }
      if (filterKelas) query = query.eq("kelas", filterKelas);
      if (filterDesil) query = query.eq("desil", filterDesil);
      if (filterNominal) query = query.eq("nominal_id", filterNominal);
      if (filterSeleksi) query = query.eq("terseleksi", filterSeleksi === "ya");
      return query;
    },
    [search, filterKelas, filterDesil, filterNominal, filterSeleksi]
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const query = terapkanFilter(
      supabase
        .from("pip_siswa")
        .select("*", { count: "exact" })
        .order("kelas", { ascending: true })
        .order("nama", { ascending: true })
        .range(page * pageSize, page * pageSize + pageSize - 1)
    );
    const { data, count, error } = await query;
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setData((data ?? []) as PipRow[]);
    setTotal(count ?? 0);
    setLoading(false);
  }, [page, pageSize, terapkanFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleImport(file: File) {
    setImporting(true);
    setError(null);
    setPesan(null);
    try {
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const sheetData = wb.Sheets["Data"] ?? wb.Sheets[wb.SheetNames[0]];
      if (!sheetData) throw new Error('Sheet "Data" tidak ditemukan di file.');
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheetData, { defval: null, raw: false });

      // Sheet "seleksi" (opsional): siswa terseleksi + kelasnya + alasan, dicocokkan lewat NISN
      const seleksi = new Map<string, { kelas: string | null; alasan: string | null }>();
      const sheetSeleksi = wb.Sheets["seleksi"];
      if (sheetSeleksi) {
        for (const r of XLSX.utils.sheet_to_json<Record<string, unknown>>(sheetSeleksi, { defval: null, raw: false })) {
          const nisn = bersih(r["NISN"]);
          if (nisn) seleksi.set(nisn, { kelas: bersih(r["KELAS"]), alasan: bersih(r["ALASAN"]) });
        }
      }

      // Baris tanpa NISN/Nama (mis. baris rekap di bawah tabel) dilewati; NISN ganda -> yang terakhir dipakai
      const perNisn = new Map<string, Record<string, unknown>>();
      for (const r of rows) {
        const nisn = bersih(r["NISN"]);
        const nama = bersih(r["Nama Murid"]);
        if (!nisn || !nama) continue;
        const sel = seleksi.get(nisn);
        perNisn.set(nisn, {
          nisn,
          nik: bersih(r["NIK"]),
          nama,
          jk: bersih(r["Jenis Kelamin"]),
          tempat_lahir: bersih(r["Tempat Lahir"]),
          tanggal_lahir: parseTanggal(r["Tanggal Lahir"]),
          nama_ibu: bersih(r["Nama Ibu"]),
          pekerjaan_ibu: bersih(r["Pekerjaan Ibu"]),
          penghasilan_ibu: bersih(r["Penghasilan Ibu"]),
          nama_ayah: bersih(r["Nama Ayah"]),
          pekerjaan_ayah: bersih(r["Pekerjaan Ayah"]),
          penghasilan_ayah: bersih(r["Penghasilan Ayah"]),
          nama_wali: bersih(r["Nama Wali"]),
          pekerjaan_wali: bersih(r["Pekerjaan Wali"]),
          penghasilan_wali: bersih(r["Penghasilan Wali"]),
          telepon: bersih(r["Telefon"]),
          kelas: bersih(r["Kelas"]),
          kode_kecamatan: bersih(r["kec"]),
          semester_id: bersih(r["Semester ID"]),
          nominal_id: bersih(r["Nominal ID"]),
          desil: bersih(r["Desil"]),
          bank: bersih(r["Bank"]),
          status_tabunganku: bersih(r["Status Tabunganku"]),
          valid_dukcapil: bersih(r["Valid Dukcapil"]) === "1",
          valid_nisn: bersih(r["Valid NISN"]) === "1",
          updated_at: new Date().toISOString(),
          // Kolom seleksi hanya dikirim untuk siswa yang ada di sheet "seleksi", supaya
          // import ulang tidak menimpa seleksi yang sudah diubah di menu PIP Seleksi.
          ...(sel ? { terseleksi: true, kelas_seleksi: sel.kelas, alasan: sel.alasan } : {}),
        });
      }
      const payload = Array.from(perNisn.values());
      if (payload.length === 0) throw new Error("Tidak ada baris siswa yang valid (kolom NISN dan Nama Murid) di file.");

      if (!window.confirm(`Import ${payload.length} siswa? Data PIP dengan NISN yang sama akan diperbarui.`)) {
        setImporting(false);
        return;
      }

      const supabase = createClient();
      // Dua kelompok dengan kolom seragam (upsert massal butuh kolom yang sama di tiap baris)
      const denganSeleksi = payload.filter((p) => "terseleksi" in p);
      const tanpaSeleksi = payload.filter((p) => !("terseleksi" in p));
      for (const kelompok of [denganSeleksi, tanpaSeleksi]) {
        for (let i = 0; i < kelompok.length; i += 200) {
          const { error } = await supabase.from("pip_siswa").upsert(kelompok.slice(i, i + 200), { onConflict: "nisn" });
          if (error) throw new Error(error.message);
        }
      }
      setPesan(`Berhasil mengimpor ${payload.length} siswa (${seleksi.size} ada di sheet seleksi).`);
      setPage(0);
      fetchData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengimpor file.");
    }
    setImporting(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleExport() {
    setExporting(true);
    const supabase = createClient();
    const semua: PipRow[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await terapkanFilter(
        supabase
          .from("pip_siswa")
          .select("*")
          .order("kelas", { ascending: true })
          .order("nama", { ascending: true })
          .range(from, from + 999)
      );
      if (error) {
        setExporting(false);
        window.alert("Gagal mengambil data: " + error.message);
        return;
      }
      semua.push(...((data ?? []) as PipRow[]));
      if (!data || data.length < 1000) break;
    }

    const ws = XLSX.utils.aoa_to_sheet([
      [
        "NO", "NISN", "NIK", "Nama Murid", "JK", "Tempat Lahir", "Tanggal Lahir", "Nama Ibu", "Pekerjaan Ibu",
        "Penghasilan Ibu", "Nama Ayah", "Pekerjaan Ayah", "Penghasilan Ayah", "Nama Wali", "Telefon", "Kelas",
        "Nominal ID", "Desil", "Bank", "Status Tabunganku", "Terseleksi", "Kelas Seleksi", "Alasan",
      ],
      ...semua.map((r, i) => [
        i + 1, r.nisn, r.nik ?? "", r.nama, r.jk ?? "", r.tempat_lahir ?? "", r.tanggal_lahir ?? "", r.nama_ibu ?? "",
        r.pekerjaan_ibu ?? "", r.penghasilan_ibu ?? "", r.nama_ayah ?? "", r.pekerjaan_ayah ?? "",
        r.penghasilan_ayah ?? "", r.nama_wali ?? "", r.telepon ?? "", r.kelas ?? "", r.nominal_id ?? "",
        r.desil ?? "", r.bank ?? "", r.status_tabunganku ?? "", r.terseleksi ? "Ya" : "Tidak",
        r.kelas_seleksi ?? "", r.alasan ?? "",
      ]),
    ]);
    // NISN (B) & NIK (C) & Telefon (O) sebagai teks supaya angka panjang / 0 di depan tidak rusak
    for (let r = 1; r <= semua.length; r++) {
      for (const col of ["B", "C", "O"]) {
        const cell = ws[col + (r + 1)];
        if (cell) {
          cell.t = "s";
          cell.z = "@";
        }
      }
    }
    ws["!cols"] = [{ wch: 5 }, { wch: 14 }, { wch: 20 }, { wch: 35 }, { wch: 5 }, { wch: 14 }, { wch: 12 }, { wch: 28 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data PIP");
    XLSX.writeFile(wb, "Data-PIP.xlsx");
    setExporting(false);
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const filterClass =
    "rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500";
  const resetPage = () => setPage(0);

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Data PIP</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            SIPINTAR — data Program Indonesia Pintar, total <strong>{total}</strong> siswa
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleExport}
            disabled={exporting || total === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Export Excel
          </button>
          {canEdit && (
            <>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleImport(f);
                }}
              />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={importing}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white text-sm font-medium px-4 py-2.5 hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Import Excel
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <select
          value={pageSize}
          onChange={(e) => {
            setPageSize(Number(e.target.value));
            resetPage();
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
              resetPage();
            }}
            placeholder="Cari nama / NISN / NIK..."
            className={`${filterClass} pl-9 w-60`}
          />
        </div>

        <select value={filterKelas} onChange={(e) => { setFilterKelas(e.target.value); resetPage(); }} className={filterClass}>
          <option value="">Semua Kelas</option>
          {["7", "8", "9"].map((k) => (
            <option key={k} value={k}>
              Kelas {k}
            </option>
          ))}
        </select>
        <select value={filterNominal} onChange={(e) => { setFilterNominal(e.target.value); resetPage(); }} className={filterClass}>
          <option value="">Semua Nominal</option>
          {["1", "2"].map((n) => (
            <option key={n} value={n}>
              Nominal {n}
            </option>
          ))}
        </select>
        <select value={filterDesil} onChange={(e) => { setFilterDesil(e.target.value); resetPage(); }} className={filterClass}>
          <option value="">Semua Desil</option>
          {["1", "2", "3", "4"].map((d) => (
            <option key={d} value={d}>
              Desil {d}
            </option>
          ))}
        </select>
        <select value={filterSeleksi} onChange={(e) => { setFilterSeleksi(e.target.value); resetPage(); }} className={filterClass}>
          <option value="">Semua (seleksi)</option>
          <option value="ya">Terseleksi</option>
          <option value="tidak">Belum terseleksi</option>
        </select>
      </div>

      {pesan && (
        <p className="text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-lg px-3 py-2 mb-4">
          {pesan}
        </p>
      )}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg px-3 py-2 mb-4">
          {error}
        </p>
      )}

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40 text-left text-slate-500 dark:text-slate-400">
                <th className="px-3 py-3 font-medium w-12">No</th>
                <th className="px-3 py-3 font-medium">NISN</th>
                <th className="px-3 py-3 font-medium">Nama Murid</th>
                <th className="px-3 py-3 font-medium">JK</th>
                <th className="px-3 py-3 font-medium">Kelas</th>
                <th className="px-3 py-3 font-medium">Tempat, Tgl Lahir</th>
                <th className="px-3 py-3 font-medium">Nama Ibu</th>
                <th className="px-3 py-3 font-medium">Telefon</th>
                <th className="px-3 py-3 font-medium text-center">Nominal</th>
                <th className="px-3 py-3 font-medium text-center">Desil</th>
                <th className="px-3 py-3 font-medium">Bank</th>
                <th className="px-3 py-3 font-medium">Tabunganku</th>
                <th className="px-3 py-3 font-medium">Seleksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={13} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500">
                    <Wallet className="h-6 w-6 mx-auto mb-2 text-slate-300" />
                    Belum ada data PIP. {canEdit ? 'Klik "Import Excel" untuk memuat file dataPIP.xlsx.' : ""}
                  </td>
                </tr>
              ) : (
                data.map((r, idx) => (
                  <tr
                    key={r.id}
                    className="border-b border-slate-100 dark:border-slate-700/60 last:border-0 hover:bg-slate-50/60 dark:hover:bg-slate-700"
                  >
                    <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400">{page * pageSize + idx + 1}</td>
                    <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">{r.nisn}</td>
                    <td className="px-3 py-2.5 font-medium text-slate-800 dark:text-slate-200">{r.nama}</td>
                    <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">{r.jk ?? "-"}</td>
                    <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">{r.kelas ?? "-"}</td>
                    <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">
                      {[r.tempat_lahir, r.tanggal_lahir].filter(Boolean).join(", ") || "-"}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">{r.nama_ibu ?? "-"}</td>
                    <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">{r.telepon ?? "-"}</td>
                    <td className="px-3 py-2.5 text-center text-slate-600 dark:text-slate-300">{r.nominal_id ?? "-"}</td>
                    <td className="px-3 py-2.5 text-center text-slate-600 dark:text-slate-300">{r.desil ?? "-"}</td>
                    <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">{r.bank ?? "-"}</td>
                    <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">{r.status_tabunganku ?? "-"}</td>
                    <td className="px-3 py-2.5">
                      {r.terseleksi ? (
                        <span className="rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 px-2 py-0.5 text-xs font-medium">
                          Terseleksi{r.kelas_seleksi ? ` (${r.kelas_seleksi})` : ""}
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {total === 0 ? "0 data" : `Menampilkan ${page * pageSize + 1}-${Math.min((page + 1) * pageSize, total)} dari ${total}`}
          </p>
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
    </div>
  );
}
