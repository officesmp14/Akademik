"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  getLast5Nis,
  getNomorUrutBerikutnya,
  getTahunAjaranKodeSaatIni,
  buildNis,
  SiswaNisEntry,
} from "@/lib/cek-nis";
import { ChevronLeft, Loader2, Copy, Check } from "lucide-react";

export default function CekNisPage() {
  const [loading, setLoading] = useState(true);
  const [siswa, setSiswa] = useState<SiswaNisEntry[]>([]);
  const [jenis, setJenis] = useState<"1" | "2">("1");
  const [semester, setSemester] = useState<"1" | "2">("1");
  const [copied, setCopied] = useState(false);

  const tahunAjaranKode = getTahunAjaranKodeSaatIni();

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const supabase = createClient();
      // Tidak difilter status_siswa: NIS harus tetap tercatat di urutan
      // meskipun siswanya nanti mutasi/alumni/berhenti.
      const { data, error } = await supabase
        .from("siswa01")
        .select("nisn, nipd, rombel, nama");

      if (!error) {
        setSiswa(data ?? []);
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  const last5 = getLast5Nis(siswa, tahunAjaranKode);
  const nomorUrutBerikutnya = getNomorUrutBerikutnya(
    siswa.map((s) => s.nipd),
    tahunAjaranKode
  );
  const nisBerikutnya = buildNis(tahunAjaranKode, jenis, semester, nomorUrutBerikutnya);

  function handleCopy() {
    navigator.clipboard.writeText(nisBerikutnya);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="p-6 md:p-8">
      <a href="/laporan"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 mb-4"
      >
        <ChevronLeft className="h-4 w-4" />
        Kembali ke Laporan
      </a>

      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-1">Cek NIS</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
        Tahun ajaran berjalan: <strong>20{tahunAjaranKode}</strong> (kode{" "}
        <strong>{tahunAjaranKode}</strong>)
      </p>

      {loading ? (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-10 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400 dark:text-slate-500" />
        </div>
      ) : (
        <>
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden mb-8">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                5 NIS Terakhir Diberikan (Tahun Ajaran 20{tahunAjaranKode})
              </p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40 text-left text-slate-500 dark:text-slate-400">
                  <th className="px-4 py-2.5 font-medium w-12">No</th>
                  <th className="px-4 py-2.5 font-medium">NISN</th>
                  <th className="px-4 py-2.5 font-medium">NIS</th>
                  <th className="px-4 py-2.5 font-medium">Kelas</th>
                  <th className="px-4 py-2.5 font-medium">Nama</th>
                </tr>
              </thead>
              <tbody>
                {last5.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400 dark:text-slate-500">
                      Belum ada NIS yang diberikan untuk tahun ajaran ini.
                    </td>
                  </tr>
                ) : (
                  last5.map((s, idx) => (
                    <tr key={s.nipd} className="border-b border-slate-100 dark:border-slate-700/60 last:border-0">
                      <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">{idx + 1}</td>
                      <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{s.nisn || "-"}</td>
                      <td className="px-4 py-2.5 font-medium text-slate-800 dark:text-slate-200">{s.nipd}</td>
                      <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{s.rombel || "-"}</td>
                      <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{s.nama || "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">
              Request NIS Baru
            </p>

            <div className="grid sm:grid-cols-2 gap-6 mb-6">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Jenis NIS</p>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 cursor-pointer">
                    <input
                      type="radio"
                      name="jenis"
                      checked={jenis === "1"}
                      onChange={() => setJenis("1")}
                      className="accent-indigo-600"
                    />
                    NIS Siswa Baru (Regular)
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 cursor-pointer">
                    <input
                      type="radio"
                      name="jenis"
                      checked={jenis === "2"}
                      onChange={() => setJenis("2")}
                      className="accent-indigo-600"
                    />
                    NIS Siswa Pindahan
                  </label>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Semester Masuk</p>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 cursor-pointer">
                    <input
                      type="radio"
                      name="semester"
                      checked={semester === "1"}
                      onChange={() => setSemester("1")}
                      className="accent-indigo-600"
                    />
                    Semester Ganjil
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 cursor-pointer">
                    <input
                      type="radio"
                      name="semester"
                      checked={semester === "2"}
                      onChange={() => setSemester("2")}
                      className="accent-indigo-600"
                    />
                    Semester Genap
                  </label>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-indigo-700 dark:text-indigo-400 mb-1">NIS berikutnya yang bisa dipakai</p>
                <p className="text-2xl font-semibold text-indigo-900 dark:text-indigo-300 tracking-wider">
                  {nisBerikutnya}
                </p>
              </div>
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-2 rounded-lg bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-400 text-sm font-medium px-3 py-2 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Tersalin" : "Salin"}
              </button>
            </div>

            <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">
              Nomor ini hanya saran — belum otomatis tersimpan ke database manapun.
              Salin nomor ini lalu isikan manual ke kolom NIPD saat menambah data siswa baru.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
