"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/client";
import { cleanRow, CleanedRow } from "@/lib/import-utils";
import {
  ChevronLeft,
  Upload,
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react";

type Stage = "pilih" | "pratinjau" | "mengimpor" | "selesai";

type ImportResult = {
  successCount: number;
  failedRows: { rowNumber: number; reason: string }[];
};

const CHUNK_SIZE = 25;

export default function ImportSiswaPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>("pilih");
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<CleanedRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);

  async function handleFile(file: File) {
    setParseError(null);
    setFileName(file.name);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
        sheet,
        { raw: false, defval: null }
      );

      if (rawRows.length === 0) {
        setParseError("File tidak berisi data, atau format sheet tidak dikenali.");
        return;
      }

      const cleaned = rawRows.map((r, i) => cleanRow(r, i + 2)); // +2: baris 1 = header

      // NISN sekarang jadi kunci pencocokan data (bukan row_index lagi,
      // karena "No" di tiap file Excel mulai dari 1 lagi). Kalau NISN
      // kosong, baris ini akan SELALU di-insert sebagai baris baru setiap
      // kali diimpor (tidak bisa dideteksi sebagai data yang sama).
      for (const row of cleaned) {
        if (!row.data.nisn) {
          row.warnings.push(
            `NISN kosong — baris ini tidak bisa dideteksi sebagai data lama saat re-import (akan selalu jadi baris baru).`
          );
        }
      }

      setRows(cleaned);
      setStage("pratinjau");
    } catch (err) {
      setParseError(
        "Gagal membaca file. Pastikan file berformat .xlsx atau .xls. (" +
          (err instanceof Error ? err.message : String(err)) +
          ")"
      );
    }
  }

  async function handleImport() {
    setStage("mengimpor");
    setProgress(0);
    const supabase = createClient();

    const failedRows: ImportResult["failedRows"] = [];
    let successCount = 0;

    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);
      const payload = chunk.map((r) => r.data);

      // Upsert: kalau row_index sudah ada, baris lama diperbarui (bukan
      // ditolak sebagai duplikat) — supaya import bisa diulang dengan aman.
      const { error } = await supabase
        .from("siswa01")
        .upsert(payload, { onConflict: "nisn" });

      if (!error) {
        successCount += chunk.length;
      } else {
        // Chunk gagal -> coba satu-satu supaya tahu persis baris mana yang error
        for (const row of chunk) {
          const { error: rowError } = await supabase
            .from("siswa01")
            .upsert(row.data, { onConflict: "nisn" });
          if (rowError) {
            failedRows.push({ rowNumber: row.rowNumber, reason: rowError.message });
          } else {
            successCount += 1;
          }
        }
      }

      setProgress(Math.min(rows.length, i + CHUNK_SIZE));
    }

    setResult({ successCount, failedRows });
    setStage("selesai");
  }

  const totalWarnings = rows.reduce((acc, r) => acc + r.warnings.length, 0);

  return (
    <div className="p-6 md:p-8 dark:bg-slate-900">
      <Link
        href="/siswa"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 mb-4"
      >
        <ChevronLeft className="h-4 w-4" />
        Kembali ke Data Siswa
      </Link>

      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-1">
        Import Data dari Excel
      </h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
        Nama kolom pada file Excel harus sama dengan nama kolom tabel{" "}
        <code className="bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded text-xs">siswa01</code>.
      </p>

      {/* STAGE: pilih file */}
      {stage === "pilih" && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-10">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl flex flex-col items-center justify-center py-14 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 dark:hover:bg-indigo-500/10 transition-colors"
          >
            <div className="h-12 w-12 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center mb-3">
              <Upload className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Klik untuk pilih file Excel
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Format .xlsx atau .xls</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </div>

          {parseError && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg px-3 py-2 mt-4">
              {parseError}
            </p>
          )}
        </div>
      )}

      {/* STAGE: pratinjau */}
      {stage === "pratinjau" && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 flex items-center gap-4">
            <div className="h-11 w-11 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{fileName}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {rows.length} baris data ditemukan
              </p>
            </div>
          </div>

          {totalWarnings > 0 && (
            <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-4">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-400">
                    {totalWarnings} nilai tidak sesuai format database
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                    Nilai-nilai berikut akan dikosongkan saat import karena tidak
                    sesuai pilihan yang diizinkan di database. Anda bisa lengkapi
                    manual nanti lewat form edit.
                  </p>
                  <ul className="text-xs text-amber-700 dark:text-amber-400 mt-2 space-y-1 max-h-40 overflow-y-auto">
                    {rows
                      .filter((r) => r.warnings.length > 0)
                      .slice(0, 15)
                      .map((r) => (
                        <li key={r.rowNumber}>
                          Baris {r.rowNumber}: {r.warnings.join(" ")}
                        </li>
                      ))}
                    {rows.filter((r) => r.warnings.length > 0).length > 15 && (
                      <li>...dan lainnya.</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Pratinjau 5 baris pertama
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-700/40 text-left text-slate-500 dark:text-slate-400">
                    <th className="px-3 py-2 font-medium">Nama</th>
                    <th className="px-3 py-2 font-medium">NISN</th>
                    <th className="px-3 py-2 font-medium">JK</th>
                    <th className="px-3 py-2 font-medium">Tempat Lahir</th>
                    <th className="px-3 py-2 font-medium">Rombel</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 5).map((r) => (
                    <tr key={r.rowNumber} className="border-b border-slate-100 dark:border-slate-700/60 last:border-0">
                      <td className="px-3 py-2">{String(r.data.nama ?? "-")}</td>
                      <td className="px-3 py-2">{String(r.data.nisn ?? "-")}</td>
                      <td className="px-3 py-2">{String(r.data.jk ?? "-")}</td>
                      <td className="px-3 py-2">{String(r.data.tempat_lahir ?? "-")}</td>
                      <td className="px-3 py-2">{String(r.data.rombel ?? "-")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setStage("pilih");
                setRows([]);
                setFileName("");
              }}
              className="px-4 py-2.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              Pilih File Lain
            </button>
            <button
              onClick={handleImport}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white text-sm font-medium px-5 py-2.5 hover:bg-indigo-700 transition-colors"
            >
              Import {rows.length} Data Siswa
            </button>
          </div>
        </div>
      )}

      {/* STAGE: mengimpor */}
      {stage === "mengimpor" && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-10 flex flex-col items-center">
          <Loader2 className="h-6 w-6 text-indigo-600 animate-spin mb-4" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Mengimpor data... {progress} / {rows.length}
          </p>
          <div className="w-full max-w-sm h-2 bg-slate-100 dark:bg-slate-700 rounded-full mt-4 overflow-hidden">
            <div
              className="h-full bg-indigo-600 transition-all"
              style={{ width: `${(progress / rows.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* STAGE: selesai */}
      {stage === "selesai" && result && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 flex items-start gap-4">
            <div className="h-11 w-11 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                Import selesai — {result.successCount} dari {rows.length} data berhasil disimpan.
              </p>
              {result.failedRows.length > 0 && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {result.failedRows.length} baris gagal disimpan, lihat rincian di bawah.
                </p>
              )}
            </div>
          </div>

          {result.failedRows.length > 0 && (
            <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-4">
              <div className="flex items-start gap-2.5">
                <XCircle className="h-4.5 w-4.5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-red-800 dark:text-red-400">
                    Baris yang gagal diimpor
                  </p>
                  <ul className="text-xs text-red-700 dark:text-red-400 mt-2 space-y-1 max-h-56 overflow-y-auto">
                    {result.failedRows.map((f) => (
                      <li key={f.rowNumber}>
                        Baris {f.rowNumber}: {f.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setStage("pilih");
                setRows([]);
                setFileName("");
                setResult(null);
              }}
              className="px-4 py-2.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              Import File Lain
            </button>
            <Link
              href="/siswa"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white text-sm font-medium px-5 py-2.5 hover:bg-indigo-700 transition-colors"
            >
              Lihat Data Siswa
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
