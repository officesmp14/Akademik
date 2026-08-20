"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/client";
import { cleanGtkRow, extractPenugasanFromRow } from "@/lib/import-utils-gtk";
import { CleanedRow } from "@/lib/import-utils";
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

type RowWithPenugasan = CleanedRow & {
  penugasan: Record<string, unknown> | null;
};

type ImportResult = {
  updatedCount: number;
  penugasanCount: number;
  failedRows: { rowNumber: number; reason: string }[];
};

export default function ImportGtkDinasPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>("pilih");
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<RowWithPenugasan[]>([]);
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

      const cleaned: RowWithPenugasan[] = rawRows.map((r, i) => {
        const cleanedRow = cleanGtkRow(r, i + 2); // +2: baris 1 = header
        const penugasan = extractPenugasanFromRow(r);
        return { ...cleanedRow, penugasan };
      });

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
    let updatedCount = 0;
    let penugasanCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const nuptk = row.data.nuptk as string | undefined;

      if (!nuptk) {
        failedRows.push({
          rowNumber: row.rowNumber,
          reason: "NUPTK kosong — tidak bisa dicocokkan dengan data yang sudah ada.",
        });
        setProgress(i + 1);
        continue;
      }

      // Cari dulu guru dengan NUPTK ini -- HANYA update, tidak pernah insert baru.
      const { data: existing, error: findError } = await supabase
        .from("datagtk")
        .select("id")
        .eq("nuptk", nuptk)
        .maybeSingle();

      if (findError || !existing) {
        failedRows.push({
          rowNumber: row.rowNumber,
          reason: `NUPTK ${nuptk} tidak ditemukan di data GTK — tambahkan guru ini dulu lewat "Import dari Sekolah" atau form Tambah GTK.`,
        });
        setProgress(i + 1);
        continue;
      }

      const { error: updateError } = await supabase
        .from("datagtk")
        .update(row.data)
        .eq("id", existing.id);

      if (updateError) {
        failedRows.push({ rowNumber: row.rowNumber, reason: updateError.message });
        setProgress(i + 1);
        continue;
      }

      updatedCount += 1;

      if (row.penugasan) {
        const { error: penugasanError } = await supabase
          .from("gtk_penugasan_mengajar")
          .insert({ ...row.penugasan, gtk_id: existing.id });

        if (penugasanError) {
          failedRows.push({
            rowNumber: row.rowNumber,
            reason: `Data GTK ter-update, tapi penugasan mengajar gagal: ${penugasanError.message}`,
          });
        } else {
          penugasanCount += 1;
        }
      }

      setProgress(i + 1);
    }

    setResult({ updatedCount, penugasanCount, failedRows });
    setStage("selesai");
  }

  const totalWarnings = rows.reduce((acc, r) => acc + r.warnings.length, 0);

  return (
    <div className="p-6 md:p-8">
      <Link
        href="/gtk"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4"
      >
        <ChevronLeft className="h-4 w-4" />
        Kembali ke Data GTK
      </Link>

      <h1 className="text-2xl font-semibold text-slate-900 mb-1">
        Import Data GTK dari Dinas Pendidikan
      </h1>
      <p className="text-sm text-slate-500 mb-6">
        Format file &quot;Master Update&quot; dari Dinas. Mode ini <strong>hanya
        memperbarui</strong> data guru yang NUPTK-nya sudah ada di database — tidak akan
        membuat data guru baru. Data penugasan mengajar tetap ditambahkan sebagai baris baru.
      </p>

      {stage === "pilih" && (
        <div className="bg-white border border-slate-200 rounded-xl p-10">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center py-14 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-colors"
          >
            <div className="h-12 w-12 rounded-full bg-indigo-50 flex items-center justify-center mb-3">
              <Upload className="h-5 w-5 text-indigo-600" />
            </div>
            <p className="text-sm font-medium text-slate-700">
              Klik untuk pilih file Excel
            </p>
            <p className="text-xs text-slate-400 mt-1">Format .xlsx atau .xls</p>
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
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mt-4">
              {parseError}
            </p>
          )}
        </div>
      )}

      {stage === "pratinjau" && (
        <div className="space-y-5">
          <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-center gap-4">
            <div className="h-11 w-11 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-800">{fileName}</p>
              <p className="text-xs text-slate-500">
                {rows.length} baris data ditemukan &middot;{" "}
                {rows.filter((r) => r.penugasan).length} baris punya data penugasan mengajar
              </p>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-xs text-amber-700">
              <strong>Mode Update-Only:</strong> baris dengan NUPTK yang belum terdaftar di
              database akan <strong>ditandai gagal</strong>, bukan otomatis dibuat sebagai
              guru baru.
            </p>
          </div>

          {totalWarnings > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="h-4.5 w-4.5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">
                    {totalWarnings} nilai tidak sesuai format database
                  </p>
                  <p className="text-xs text-amber-700 mt-1">
                    Nilai-nilai berikut akan dikosongkan saat import karena tidak
                    sesuai pilihan yang diizinkan di database.
                  </p>
                  <ul className="text-xs text-amber-700 mt-2 space-y-1 max-h-40 overflow-y-auto">
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

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200">
              <p className="text-sm font-medium text-slate-700">
                Pratinjau 5 baris pertama
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 text-left text-slate-500">
                    <th className="px-3 py-2 font-medium">Nama</th>
                    <th className="px-3 py-2 font-medium">NUPTK</th>
                    <th className="px-3 py-2 font-medium">Mengajar</th>
                    <th className="px-3 py-2 font-medium">Sekolah</th>
                    <th className="px-3 py-2 font-medium">Status Sekolah</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 5).map((r) => (
                    <tr key={r.rowNumber} className="border-b border-slate-100 last:border-0">
                      <td className="px-3 py-2">{String(r.data.nama ?? "-")}</td>
                      <td className="px-3 py-2">{String(r.data.nuptk ?? "-")}</td>
                      <td className="px-3 py-2">{String(r.penugasan?.mengajar ?? "-")}</td>
                      <td className="px-3 py-2">{String(r.penugasan?.nama_sekolah ?? "-")}</td>
                      <td className="px-3 py-2">{String(r.penugasan?.status_sekolah ?? "-")}</td>
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
              className="px-4 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Pilih File Lain
            </button>
            <button
              onClick={handleImport}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white text-sm font-medium px-5 py-2.5 hover:bg-indigo-700 transition-colors"
            >
              Update {rows.length} Data GTK
            </button>
          </div>
        </div>
      )}

      {stage === "mengimpor" && (
        <div className="bg-white border border-slate-200 rounded-xl p-10 flex flex-col items-center">
          <Loader2 className="h-6 w-6 text-indigo-600 animate-spin mb-4" />
          <p className="text-sm font-medium text-slate-700">
            Memperbarui data... {progress} / {rows.length}
          </p>
          <div className="w-full max-w-sm h-2 bg-slate-100 rounded-full mt-4 overflow-hidden">
            <div
              className="h-full bg-indigo-600 transition-all"
              style={{ width: `${(progress / rows.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {stage === "selesai" && result && (
        <div className="space-y-5">
          <div className="bg-white border border-slate-200 rounded-xl p-6 flex items-start gap-4">
            <div className="h-11 w-11 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-800">
                Update selesai — {result.updatedCount} dari {rows.length} data GTK berhasil
                diperbarui, {result.penugasanCount} baris penugasan mengajar ditambahkan.
              </p>
              {result.failedRows.length > 0 && (
                <p className="text-xs text-slate-500 mt-1">
                  {result.failedRows.length} baris ada masalah, lihat rincian di bawah.
                </p>
              )}
            </div>
          </div>

          {result.failedRows.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-start gap-2.5">
                <XCircle className="h-4.5 w-4.5 text-red-600 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-red-800">
                    Baris yang bermasalah
                  </p>
                  <ul className="text-xs text-red-700 mt-2 space-y-1 max-h-56 overflow-y-auto">
                    {result.failedRows.map((f, idx) => (
                      <li key={idx}>
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
              className="px-4 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Import File Lain
            </button>
            <Link
              href="/gtk"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white text-sm font-medium px-5 py-2.5 hover:bg-indigo-700 transition-colors"
            >
              Lihat Data GTK
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
