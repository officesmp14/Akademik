"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { compareKelas } from "@/lib/rekap-siswa";
import { getTahunAjaranSaatIni } from "@/types/nilai";
import { formatNomorUnikSkl } from "@/lib/nomor-unik-skl";
import { Loader2, Check, RefreshCw } from "lucide-react";

type Siswa = { id: string; nama: string | null; nisn: string | null; rombel: string | null };

export default function NomorUnikSklPage() {
  const [tahunAjaran, setTahunAjaran] = useState(getTahunAjaranSaatIni());
  const [kodeKlasifikasi, setKodeKlasifikasi] = useState("400.3.11");
  const [kodeSekolah, setKodeSekolah] = useState("SMPN.14");
  const [nomorAwal, setNomorAwal] = useState<number>(1);

  const [siswaList, setSiswaList] = useState<Siswa[]>([]);
  const [nomorMap, setNomorMap] = useState<Record<string, number>>({});

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const [pengaturanRes, siswaRes] = await Promise.all([
      supabase
        .from("pengaturan_skl")
        .select("kode_klasifikasi_skl, kode_sekolah_skl, nomor_awal_skl")
        .eq("id", 1)
        .maybeSingle(),
      supabase
        .from("siswa01")
        .select("id, nama, nisn, rombel")
        .like("rombel", "IX.%")
        .eq("status_siswa", "Aktif"),
    ]);

    if (siswaRes.error) {
      setError(siswaRes.error.message);
      setLoading(false);
      return;
    }

    if (pengaturanRes.data) {
      if (pengaturanRes.data.kode_klasifikasi_skl) setKodeKlasifikasi(pengaturanRes.data.kode_klasifikasi_skl);
      if (pengaturanRes.data.kode_sekolah_skl) setKodeSekolah(pengaturanRes.data.kode_sekolah_skl);
      if (pengaturanRes.data.nomor_awal_skl) setNomorAwal(pengaturanRes.data.nomor_awal_skl);
    }

    const siswaRows = ((siswaRes.data ?? []) as Siswa[]).sort((a, b) => {
      const kelas = compareKelas(a.rombel || "", b.rombel || "");
      if (kelas !== 0) return kelas;
      return (a.nama || "").localeCompare(b.nama || "");
    });
    setSiswaList(siswaRows);

    const nisnList = siswaRows.filter((s) => s.nisn).map((s) => s.nisn as string);
    if (nisnList.length > 0) {
      const { data: nomorRows, error: nomorErr } = await supabase
        .from("nomor_unik_skl")
        .select("nisn, nomor_unik")
        .in("nisn", nisnList)
        .eq("tahun_ajaran", tahunAjaran);
      if (nomorErr) {
        setError(nomorErr.message);
      } else {
        const map: Record<string, number> = {};
        for (const row of nomorRows ?? []) map[row.nisn] = row.nomor_unik;
        setNomorMap(map);
      }
    } else {
      setNomorMap({});
    }

    setLoading(false);
  }, [tahunAjaran]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleGenerate() {
    const nisnList = siswaList.filter((s) => s.nisn);
    if (nisnList.length === 0) return;

    const sudahAda = nisnList.some((s) => nomorMap[s.nisn as string] !== undefined);
    if (
      sudahAda &&
      !window.confirm(
        "Beberapa siswa sudah punya Nomor Unik SKL untuk tahun ajaran ini. Generate ulang akan menimpa nomor yang lama. Lanjutkan?"
      )
    ) {
      return;
    }

    setGenerating(true);
    setSaved(false);
    setError(null);
    const supabase = createClient();

    const rows = nisnList.map((s, idx) => ({
      nisn: s.nisn as string,
      tahun_ajaran: tahunAjaran,
      nomor_unik: nomorAwal + idx,
    }));

    const [{ error: nomorErr }, { error: pengaturanErr }] = await Promise.all([
      supabase.from("nomor_unik_skl").upsert(rows, { onConflict: "nisn,tahun_ajaran" }),
      supabase.from("pengaturan_skl").upsert({
        id: 1,
        kode_klasifikasi_skl: kodeKlasifikasi,
        kode_sekolah_skl: kodeSekolah,
        nomor_awal_skl: nomorAwal,
      }),
    ]);

    setGenerating(false);
    if (nomorErr) {
      setError(nomorErr.message);
      return;
    }
    if (pengaturanErr) {
      setError(pengaturanErr.message);
      return;
    }

    const map: Record<string, number> = {};
    for (const r of rows) map[r.nisn] = r.nomor_unik;
    setNomorMap(map);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto dark:bg-slate-900 min-h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Nomor Unik SKL</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Nomor surat resmi tiap siswa kelas IX untuk SKL, dibuat otomatis secara berurutan.
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg px-3 py-2 mb-4">
          {error}
        </p>
      )}

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 space-y-5 mb-6">
        <div className="flex items-center justify-between gap-4">
          <label className="text-sm text-slate-700 dark:text-slate-200">Tahun Ajaran</label>
          <input
            value={tahunAjaran}
            onChange={(e) => setTahunAjaran(e.target.value)}
            placeholder="2025/2026"
            className="w-32 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm text-center bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <label className="text-sm text-slate-700 dark:text-slate-200">Kode Klasifikasi Surat</label>
          <input
            value={kodeKlasifikasi}
            onChange={(e) => setKodeKlasifikasi(e.target.value)}
            placeholder="400.3.11"
            className="w-32 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm text-center bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <label className="text-sm text-slate-700 dark:text-slate-200">Kode Sekolah</label>
          <input
            value={kodeSekolah}
            onChange={(e) => setKodeSekolah(e.target.value)}
            placeholder="SMPN.14"
            className="w-32 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm text-center bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-100 dark:border-slate-700/60">
          <label className="text-sm text-slate-700 dark:text-slate-200">Nomor Awal</label>
          <input
            type="number"
            value={nomorAwal}
            onChange={(e) => setNomorAwal(Number(e.target.value))}
            className="w-32 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm text-center bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <p className="text-xs text-slate-400 dark:text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-700/60">
          Contoh hasil: Nomor : {formatNomorUnikSkl(kodeKlasifikasi, nomorAwal, kodeSekolah, tahunAjaran)}
        </p>

        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={handleGenerate}
            disabled={generating || loading || siswaList.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white text-sm font-medium px-5 py-2.5 hover:bg-indigo-700 disabled:opacity-60"
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Generate Nomor Otomatis
          </button>
          {saved && (
            <span className="inline-flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400">
              <Check className="h-4 w-4" /> Tersimpan.
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-10 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400 dark:text-slate-500" />
        </div>
      ) : siswaList.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-10 text-center text-slate-400 dark:text-slate-500">
          Tidak ada siswa aktif kelas IX.
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-x-auto overflow-y-auto max-h-[28rem]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white dark:bg-slate-800">
              <tr className="border-b border-slate-200 dark:border-slate-700 text-left text-slate-500 dark:text-slate-400">
                <th className="px-4 py-2.5 w-10">No</th>
                <th className="px-4 py-2.5">Nama</th>
                <th className="px-4 py-2.5">Kelas</th>
                <th className="px-4 py-2.5">Nomor Unik SKL</th>
              </tr>
            </thead>
            <tbody>
              {siswaList.map((s, idx) => {
                const nomor = s.nisn ? nomorMap[s.nisn] : undefined;
                return (
                  <tr key={s.id} className="border-b border-slate-100 dark:border-slate-700/60 last:border-0">
                    <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{idx + 1}</td>
                    <td className="px-4 py-2 text-slate-900 dark:text-slate-100">{s.nama}</td>
                    <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{s.rombel}</td>
                    <td className="px-4 py-2 text-slate-900 dark:text-slate-100">
                      {nomor !== undefined
                        ? `Nomor : ${formatNomorUnikSkl(kodeKlasifikasi, nomor, kodeSekolah, tahunAjaran)}`
                        : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
