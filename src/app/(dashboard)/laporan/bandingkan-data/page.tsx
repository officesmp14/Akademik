"use client";

import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/client";
import { classifyAgama } from "@/lib/rekap-siswa";
import {
  ChevronLeft,
  Upload,
  FileSpreadsheet,
  Loader2,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

type ExcelRow = { nisn: string; nama: string; rombel: string; agama: string };
type DbRow = { nisn: string | null; nama: string | null; rombel: string | null; agama: string | null };

type MismatchRow = {
  nisn: string;
  namaExcel: string;
  namaDb: string;
  rombelExcel: string;
  rombelDb: string;
  status: string;
};

const AGAMA_KEYS = ["islam", "kristen", "katolik", "hindu", "budha", "konghucu"] as const;
type AgamaKey = (typeof AGAMA_KEYS)[number];
const AGAMA_LABELS: Record<AgamaKey, string> = {
  islam: "Islam",
  kristen: "Kristen",
  katolik: "Katholik",
  hindu: "Hindu",
  budha: "Budha",
  konghucu: "Khonghucu",
};

type AgamaCompareRow = { key: AgamaKey; label: string; excel: number; db: number };

function normalizeHeader(v: unknown) {
  return String(v ?? "").trim().toLowerCase();
}

/** Cari baris header (baris pertama yang punya sel "NISN") dan posisi kolom
 *  NISN/Nama/Rombel/Agama -- supaya tidak bergantung pada urutan kolom atau
 *  gaya penulisan header (snake_case seperti "nisn" ataupun label Dapodik
 *  seperti "NISN", "Rombel Saat Ini"). */
function findColumns(aoa: unknown[][]) {
  for (let i = 0; i < aoa.length; i++) {
    const row = aoa[i];
    const nisnCol = row.findIndex((c) => normalizeHeader(c) === "nisn");
    if (nisnCol === -1) continue;

    const findCol = (labels: string[]) =>
      row.findIndex((c) => labels.includes(normalizeHeader(c)));

    return {
      headerRowIndex: i,
      nisn: nisnCol,
      nama: findCol(["nama"]),
      rombel: findCol(["rombel", "rombel saat ini"]),
      agama: findCol(["agama"]),
    };
  }
  return null;
}

type CompareScope = "semua" | "aktif";

export default function BandingkanDataPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [excelMap, setExcelMap] = useState<Map<string, ExcelRow> | null>(null);
  const [compareScope, setCompareScope] = useState<CompareScope>("semua");

  const [excelTotal, setExcelTotal] = useState(0);
  const [dbTotal, setDbTotal] = useState(0);
  const [emptyNisnCount, setEmptyNisnCount] = useState(0);
  const [mismatches, setMismatches] = useState<MismatchRow[] | null>(null);
  const [agamaCompare, setAgamaCompare] = useState<AgamaCompareRow[] | null>(null);

  function normalize(v: string | null | undefined) {
    return (v ?? "").trim().toLowerCase();
  }

  async function compareWithDb(map: Map<string, ExcelRow>, scope: CompareScope) {
    setLoading(true);
    setError(null);
    setMismatches(null);
    setAgamaCompare(null);

    const supabase = createClient();
    let query = supabase.from("siswa01").select("nisn, nama, rombel, agama").not("nisn", "is", null);
    if (scope === "aktif") query = query.eq("status_siswa", "Aktif");

    const { data, error: dbError } = await query;

    if (dbError) {
      setError(dbError.message);
      setLoading(false);
      return;
    }

    const dbMap = new Map<string, DbRow>();
    for (const row of (data ?? []) as DbRow[]) {
      const nisn = (row.nisn ?? "").trim();
      if (!nisn) continue;
      dbMap.set(nisn, row);
    }
    setDbTotal(dbMap.size);

    // 1. Data yang tidak match (NISN, Nama, Rombel)
    const allNisn = new Set([...map.keys(), ...dbMap.keys()]);
    const result: MismatchRow[] = [];

    for (const nisn of allNisn) {
      const ex = map.get(nisn);
      const db = dbMap.get(nisn);

      if (ex && !db) {
        result.push({
          nisn,
          namaExcel: ex.nama,
          namaDb: "-",
          rombelExcel: ex.rombel,
          rombelDb: "-",
          status: scope === "aktif" ? "Tidak ada di Data Siswa Aktif" : "Tidak ada di Data Siswa",
        });
        continue;
      }

      if (!ex && db) {
        result.push({
          nisn,
          namaExcel: "-",
          namaDb: db.nama ?? "-",
          rombelExcel: "-",
          rombelDb: db.rombel ?? "-",
          status: "Tidak ada di file Excel",
        });
        continue;
      }

      if (ex && db) {
        const namaBeda = normalize(ex.nama) !== normalize(db.nama);
        const rombelBeda = normalize(ex.rombel) !== normalize(db.rombel);
        if (namaBeda || rombelBeda) {
          const keterangan = [namaBeda && "Nama berbeda", rombelBeda && "Rombel berbeda"]
            .filter(Boolean)
            .join(", ");
          result.push({
            nisn,
            namaExcel: ex.nama || "-",
            namaDb: db.nama || "-",
            rombelExcel: ex.rombel || "-",
            rombelDb: db.rombel || "-",
            status: keterangan,
          });
        }
      }
    }

    result.sort((a, b) => a.nisn.localeCompare(b.nisn));
    setMismatches(result);

    // 2. Perbandingan kolom Agama
    const excelCounts: Record<AgamaKey, number> = {
      islam: 0,
      kristen: 0,
      katolik: 0,
      hindu: 0,
      budha: 0,
      konghucu: 0,
    };
    const dbCounts: Record<AgamaKey, number> = { ...excelCounts };

    for (const ex of map.values()) {
      const cat = classifyAgama(ex.agama);
      if (cat) excelCounts[cat] += 1;
    }
    for (const db of dbMap.values()) {
      const cat = classifyAgama(db.agama);
      if (cat) dbCounts[cat] += 1;
    }

    setAgamaCompare(
      AGAMA_KEYS.map((key) => ({
        key,
        label: AGAMA_LABELS[key],
        excel: excelCounts[key],
        db: dbCounts[key],
      }))
    );

    setLoading(false);
  }

  function handleScopeChange(scope: CompareScope) {
    setCompareScope(scope);
    if (excelMap) compareWithDb(excelMap, scope);
  }

  async function handleFile(file: File) {
    setError(null);
    setFileName(file.name);
    setLoading(true);
    setMismatches(null);
    setAgamaCompare(null);
    setExcelMap(null);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
        header: 1,
        raw: false,
        defval: "",
      });

      if (aoa.length === 0) {
        setError("File tidak berisi data, atau format sheet tidak dikenali.");
        setLoading(false);
        return;
      }

      const cols = findColumns(aoa);
      if (!cols) {
        setError('Kolom "NISN" tidak ditemukan di file ini. Pastikan file punya baris header dengan kolom NISN.');
        setLoading(false);
        return;
      }

      const map = new Map<string, ExcelRow>();
      let emptyNisn = 0;
      for (const row of aoa.slice(cols.headerRowIndex + 1)) {
        const nisn = String(row[cols.nisn] ?? "").trim();
        if (!nisn) {
          emptyNisn += 1;
          continue;
        }
        map.set(nisn, {
          nisn,
          nama: String(cols.nama !== -1 ? row[cols.nama] : "").trim(),
          rombel: String(cols.rombel !== -1 ? row[cols.rombel] : "").trim(),
          agama: String(cols.agama !== -1 ? row[cols.agama] : "").trim(),
        });
      }
      setEmptyNisnCount(emptyNisn);
      setExcelTotal(map.size);
      setExcelMap(map);

      await compareWithDb(map, compareScope);
    } catch (err) {
      setError(
        "Gagal membaca file. Pastikan file berformat .xlsx atau .xls. (" +
          (err instanceof Error ? err.message : String(err)) +
          ")"
      );
      setLoading(false);
    }
  }

  const hasResult = mismatches !== null && agamaCompare !== null;

  return (
    <div className="p-6 md:p-8">
      <a
        href="/laporan"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 mb-4"
      >
        <ChevronLeft className="h-4 w-4" />
        Kembali ke Laporan
      </a>

      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-1">Bandingkan Data</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
        Upload file Excel (format sama dengan tabel <code className="bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded text-xs">siswa01</code>,
        mis. export Dapodik) untuk dibandingkan dengan data siswa yang tersimpan di aplikasi. Pencocokan memakai kolom <strong>NISN</strong>.
      </p>

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 mb-6">
        <div className="mb-5">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">Bandingkan dengan data siswa:</p>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 cursor-pointer">
              <input
                type="radio"
                name="compareScope"
                checked={compareScope === "semua"}
                onChange={() => handleScopeChange("semua")}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
              />
              Semua siswa
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 cursor-pointer">
              <input
                type="radio"
                name="compareScope"
                checked={compareScope === "aktif"}
                onChange={() => handleScopeChange("aktif")}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
              />
              Hanya siswa aktif (status &quot;Aktif&quot;)
            </label>
          </div>
        </div>

        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl flex flex-col items-center justify-center py-10 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 dark:hover:bg-indigo-500/10 transition-colors"
        >
          <div className="h-12 w-12 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center mb-3">
            <Upload className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Klik untuk pilih file Excel</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Format .xlsx atau .xls</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />
        </div>

        {fileName && !loading && (
          <div className="flex items-center gap-3 mt-4 text-sm text-slate-600 dark:text-slate-300">
            <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            {fileName}
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-2 mt-4 text-sm text-slate-500 dark:text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Membaca & membandingkan data...
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg px-3 py-2 mt-4">
            {error}
          </p>
        )}
      </div>

      {hasResult && (
        <div className="space-y-6">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
              <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{excelTotal}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Baris di file Excel (NISN terisi)</p>
            </div>
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
              <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{dbTotal}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Data siswa {compareScope === "aktif" ? "aktif" : ""} di aplikasi (NISN terisi)
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
              <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{mismatches!.length}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Baris tidak cocok</p>
            </div>
          </div>

          {emptyNisnCount > 0 && (
            <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-4 flex items-start gap-2.5">
              <AlertTriangle className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800 dark:text-amber-400">
                {emptyNisnCount} baris di file Excel memiliki NISN kosong, sehingga tidak bisa
                dibandingkan dan diabaikan dari hasil di bawah ini.
              </p>
            </div>
          )}

          {/* Output 1: data tidak match */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Data Tidak Cocok (NISN, Nama, Rombel)
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40 text-left text-slate-500 dark:text-slate-400">
                    <th className="px-3 py-2.5 font-medium w-12">No</th>
                    <th className="px-3 py-2.5 font-medium">NISN</th>
                    <th className="px-3 py-2.5 font-medium">Nama (Excel)</th>
                    <th className="px-3 py-2.5 font-medium">Nama (Data Siswa)</th>
                    <th className="px-3 py-2.5 font-medium">Rombel (Excel)</th>
                    <th className="px-3 py-2.5 font-medium">Rombel (Data Siswa)</th>
                    <th className="px-3 py-2.5 font-medium">Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {mismatches!.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-slate-400 dark:text-slate-500">
                        <CheckCircle2 className="h-5 w-5 mx-auto mb-2 text-emerald-400 dark:text-emerald-500" />
                        Semua data cocok, tidak ada perbedaan.
                      </td>
                    </tr>
                  ) : (
                    mismatches!.map((m, idx) => (
                      <tr key={m.nisn} className="border-b border-slate-100 dark:border-slate-700/60 last:border-0 hover:bg-slate-50/60 dark:hover:bg-slate-700/60">
                        <td className="px-3 py-2 text-slate-500 dark:text-slate-400">{idx + 1}</td>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{m.nisn}</td>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{m.namaExcel}</td>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{m.namaDb}</td>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{m.rombelExcel}</td>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{m.rombelDb}</td>
                        <td className="px-3 py-2">
                          <span className="inline-flex items-center rounded-full bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 px-2.5 py-0.5 text-xs font-medium">
                            {m.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Output 2: perbandingan agama */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Perbandingan Kolom Agama</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40 text-left text-slate-500 dark:text-slate-400">
                    <th className="px-3 py-2.5 font-medium">Agama</th>
                    <th className="px-3 py-2.5 font-medium text-center">Jumlah di Excel</th>
                    <th className="px-3 py-2.5 font-medium text-center">Jumlah di Data Siswa</th>
                    <th className="px-3 py-2.5 font-medium text-center">Selisih</th>
                  </tr>
                </thead>
                <tbody>
                  {agamaCompare!.map((row) => {
                    const selisih = row.excel - row.db;
                    return (
                      <tr key={row.key} className="border-b border-slate-100 dark:border-slate-700/60 last:border-0">
                        <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-200">{row.label}</td>
                        <td className="px-3 py-2 text-center text-slate-600 dark:text-slate-300">{row.excel}</td>
                        <td className="px-3 py-2 text-center text-slate-600 dark:text-slate-300">{row.db}</td>
                        <td
                          className={`px-3 py-2 text-center font-medium ${
                            selisih === 0 ? "text-slate-400 dark:text-slate-500" : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {selisih > 0 ? `+${selisih}` : selisih}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
