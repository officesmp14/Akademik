"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { compareKelas } from "@/lib/rekap-siswa";
import { getTahunAjaranSaatIni } from "@/types/nilai";
import { formatNomorUnikSkl } from "@/lib/nomor-unik-skl";
import {
  fetchNilaiRekapData,
  formatNilai,
  hitungJumlahRataRata,
  hitungRank,
  NilaiRekapData,
} from "@/lib/nilai-rekap";
import { Loader2, Check, RefreshCw, Upload } from "lucide-react";

type TabKey = "pengaturan" | "nomor-unik" | "nomor-sertifikat" | "background-sertifikat";

const TABS: { key: TabKey; label: string }[] = [
  { key: "pengaturan", label: "Pengaturan SKL" },
  { key: "nomor-unik", label: "Nomor Unik SKL" },
  { key: "nomor-sertifikat", label: "Nomor Sertifikat" },
  { key: "background-sertifikat", label: "Background Sertifikat" },
];

const MAX_ORIGINAL_FILE_MB = 5;
const MAX_DIMENSION_SERTIFIKAT = 2000;

/** Resize gambar di browser (pakai Canvas) sebelum diupload, sama seperti
 *  di halaman Profil Sekolah -- supaya file besar dari kamera/HP tidak
 *  membebani storage & bandwidth. Output PNG. */
function resizeImage(file: File, maxDimension: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Gagal memproses gambar (canvas tidak didukung)."));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Gagal mengonversi gambar."));
        },
        "image/png",
        0.9
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("File bukan gambar yang valid."));
    };

    img.src = url;
  });
}

type PengaturanSkl = {
  id: number;
  bobot_rapor: number;
  bobot_ujian_sekolah: number;
  tanggal_cetak_skl: string | null;
};

function PengaturanTab() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({ bobot_rapor: 70, bobot_ujian_sekolah: 30, tanggal_cetak_skl: "" });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error: err } = await supabase.from("pengaturan_skl").select("*").eq("id", 1).maybeSingle();

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    if (data) {
      const row = data as PengaturanSkl;
      setForm({
        bobot_rapor: row.bobot_rapor,
        bobot_ujian_sekolah: row.bobot_ujian_sekolah,
        tanggal_cetak_skl: row.tanggal_cetak_skl ?? "",
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const total = form.bobot_rapor + form.bobot_ujian_sekolah;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);
    const supabase = createClient();

    const { error: err } = await supabase.from("pengaturan_skl").upsert({
      id: 1,
      ...form,
      tanggal_cetak_skl: form.tanggal_cetak_skl || null,
    });

    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="max-w-2xl">
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg px-3 py-2 mb-4">
          {error}
        </p>
      )}

      {loading ? (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-10 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400 dark:text-slate-500" />
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 space-y-5"
        >
          <div className="flex items-center justify-between gap-4">
            <label className="text-sm text-slate-700 dark:text-slate-200">
              Nilai Raport Kelas 7, 8, 9 (6 Semester)
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={0}
                max={100}
                value={form.bobot_rapor}
                onChange={(e) => setForm((p) => ({ ...p, bobot_rapor: Number(e.target.value) }))}
                className="w-24 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm text-center bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-sm text-slate-500 dark:text-slate-400">%</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <label className="text-sm text-slate-700 dark:text-slate-200">
              Nilai Ujian Sekolah (Tertulis + Praktik)
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={0}
                max={100}
                value={form.bobot_ujian_sekolah}
                onChange={(e) => setForm((p) => ({ ...p, bobot_ujian_sekolah: Number(e.target.value) }))}
                className="w-24 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm text-center bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-sm text-slate-500 dark:text-slate-400">%</span>
            </div>
          </div>

          <p
            className={`text-xs pt-1 border-t border-slate-100 dark:border-slate-700/60 ${
              total === 100 ? "text-slate-400 dark:text-slate-500" : "text-amber-600 dark:text-amber-400"
            }`}
          >
            Total bobot: {total}% {total !== 100 && "-- idealnya total 100%"}
          </p>

          <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-100 dark:border-slate-700/60">
            <label className="text-sm text-slate-700 dark:text-slate-200">Tanggal Cetak SKL</label>
            <input
              type="date"
              value={form.tanggal_cetak_skl}
              onChange={(e) => setForm((p) => ({ ...p, tanggal_cetak_skl: e.target.value }))}
              className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white text-sm font-medium px-5 py-2.5 hover:bg-indigo-700 disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saved && <Check className="h-4 w-4" />}
              Simpan
            </button>
            {saved && <span className="text-sm text-emerald-600 dark:text-emerald-400">Tersimpan.</span>}
          </div>
        </form>
      )}
    </div>
  );
}

type SiswaNomorUnik = { id: string; nama: string | null; nisn: string | null; rombel: string | null };

function NomorUnikTab() {
  const [tahunAjaran, setTahunAjaran] = useState(getTahunAjaranSaatIni());
  const [kodeKlasifikasi, setKodeKlasifikasi] = useState("400.3.11");
  const [kodeSekolah, setKodeSekolah] = useState("SMPN.14");
  const [nomorAwal, setNomorAwal] = useState<number>(1);

  const [siswaList, setSiswaList] = useState<SiswaNomorUnik[]>([]);
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
      supabase.from("siswa01").select("id, nama, nisn, rombel").like("rombel", "IX.%").eq("status_siswa", "Aktif"),
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

    const siswaRows = ((siswaRes.data ?? []) as SiswaNomorUnik[]).sort((a, b) => {
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
    <div className="max-w-3xl">
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

const EMPTY_REKAP_DATA: NilaiRekapData = { siswaList: [], bobotRapor: null, rataRataMap: {}, ujianSklMap: {} };
const BATAS_PERINGKAT_KELAS = 3;

type BarisSertifikat = {
  id: string;
  nama: string | null;
  nisn: string | null;
  rombel: string | null;
  totalNilai: number | null;
  peringkatKelas: number;
  peringkatUmum: number | null;
};

function NomorSertifikatTab() {
  const [tahunAjaran, setTahunAjaran] = useState(getTahunAjaranSaatIni());
  const [kodeKlasifikasi, setKodeKlasifikasi] = useState("400.3.11");
  const [kodeSekolah, setKodeSekolah] = useState("SMPN.14");
  const [nomorAwal, setNomorAwal] = useState<number>(1);

  const [data, setData] = useState<NilaiRekapData>(EMPTY_REKAP_DATA);
  const [nomorMap, setNomorMap] = useState<Record<string, number>>({});

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const [pengaturanRes, rekapRes] = await Promise.all([
      supabase
        .from("pengaturan_skl")
        .select("kode_klasifikasi_skl, kode_sekolah_skl, nomor_awal_sertifikat")
        .eq("id", 1)
        .maybeSingle(),
      fetchNilaiRekapData(supabase, { tahunAjaran, kelasFilter: "" }),
    ]);

    if (pengaturanRes.data) {
      if (pengaturanRes.data.kode_klasifikasi_skl) setKodeKlasifikasi(pengaturanRes.data.kode_klasifikasi_skl);
      if (pengaturanRes.data.kode_sekolah_skl) setKodeSekolah(pengaturanRes.data.kode_sekolah_skl);
      if (pengaturanRes.data.nomor_awal_sertifikat) setNomorAwal(pengaturanRes.data.nomor_awal_sertifikat);
    }

    if (rekapRes.error) {
      setError(rekapRes.error);
      setLoading(false);
      return;
    }
    setData(rekapRes.data);

    const nisnList = rekapRes.data.siswaList.filter((s) => s.nisn).map((s) => s.nisn as string);
    if (nisnList.length > 0) {
      const { data: nomorRows, error: nomorErr } = await supabase
        .from("nomor_sertifikat")
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

  // Siswa yang ditampilkan sama dengan halaman Peringkat: 3 besar tiap
  // kelas IX berdasarkan peringkat kelas.
  const siswaBernisn = data.siswaList.filter((s) => s.nisn);
  const nisnSemua = siswaBernisn.map((s) => s.nisn as string);
  const rankUmumMap = hitungRank(nisnSemua, data);
  const rombelList = Array.from(
    new Set(siswaBernisn.map((s) => s.rombel).filter((r): r is string => !!r))
  ).sort(compareKelas);

  const top3PerKelas: BarisSertifikat[] = rombelList.flatMap((rombel) => {
    const nisnKelas = siswaBernisn.filter((s) => s.rombel === rombel).map((s) => s.nisn as string);
    const rankKelas = hitungRank(nisnKelas, data);
    return siswaBernisn
      .filter((s) => s.rombel === rombel)
      .map((s) => ({ siswa: s, peringkatKelas: rankKelas.get(s.nisn as string) ?? null }))
      .filter(
        (s): s is { siswa: typeof s.siswa; peringkatKelas: number } =>
          s.peringkatKelas !== null && s.peringkatKelas <= BATAS_PERINGKAT_KELAS
      )
      .sort((a, b) => a.peringkatKelas - b.peringkatKelas)
      .map(({ siswa, peringkatKelas }) => ({
        id: siswa.id,
        nama: siswa.nama,
        nisn: siswa.nisn,
        rombel: siswa.rombel,
        totalNilai: hitungJumlahRataRata(data, siswa.nisn as string).jumlah,
        peringkatKelas,
        peringkatUmum: rankUmumMap.get(siswa.nisn as string) ?? null,
      }));
  });

  async function handleGenerate() {
    const nisnList = top3PerKelas.filter((s) => s.nisn);
    if (nisnList.length === 0) return;

    const sudahAda = nisnList.some((s) => nomorMap[s.nisn as string] !== undefined);
    if (
      sudahAda &&
      !window.confirm(
        "Beberapa siswa sudah punya Nomor Sertifikat untuk tahun ajaran ini. Generate ulang akan menimpa nomor yang lama. Lanjutkan?"
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
      supabase.from("nomor_sertifikat").upsert(rows, { onConflict: "nisn,tahun_ajaran" }),
      supabase.from("pengaturan_skl").upsert({
        id: 1,
        kode_klasifikasi_skl: kodeKlasifikasi,
        kode_sekolah_skl: kodeSekolah,
        nomor_awal_sertifikat: nomorAwal,
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
    <div className="max-w-none">
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
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Berlaku untuk 3 besar tiap kelas IX (sama seperti halaman Peringkat), diisi ke kolom No. Seri Ijazah.
        </p>

        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={handleGenerate}
            disabled={generating || loading || top3PerKelas.length === 0}
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
      ) : top3PerKelas.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-10 text-center text-slate-400 dark:text-slate-500">
          Belum ada data nilai siswa kelas IX.
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-x-auto overflow-y-auto max-h-[28rem]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white dark:bg-slate-800">
              <tr className="border-b border-slate-200 dark:border-slate-700 text-left text-slate-500 dark:text-slate-400">
                <th className="px-4 py-2.5 w-10">No</th>
                <th className="px-4 py-2.5">Nama</th>
                <th className="px-4 py-2.5">Kelas</th>
                <th className="px-4 py-2.5">Total Nilai</th>
                <th className="px-4 py-2.5">Peringkat Kelas</th>
                <th className="px-4 py-2.5">Peringkat Umum</th>
                <th className="px-4 py-2.5">Nomor Sertifikat</th>
              </tr>
            </thead>
            <tbody>
              {top3PerKelas.map((s, idx) => {
                const nomor = s.nisn ? nomorMap[s.nisn] : undefined;
                return (
                  <tr key={s.id} className="border-b border-slate-100 dark:border-slate-700/60 last:border-0">
                    <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{idx + 1}</td>
                    <td className="px-4 py-2 text-slate-900 dark:text-slate-100">{s.nama}</td>
                    <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{s.rombel}</td>
                    <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{formatNilai(s.totalNilai)}</td>
                    <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{s.peringkatKelas}</td>
                    <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{s.peringkatUmum ?? "-"}</td>
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

function BackgroundSertifikatTab() {
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("pengaturan_skl")
      .select("background_sertifikat_url")
      .eq("id", 1)
      .maybeSingle();

    if (err) {
      setError(err.message);
    } else {
      setBackgroundUrl(data?.background_sertifikat_url ?? null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleUpload(file: File) {
    setError(null);

    if (!file.type.startsWith("image/")) {
      setError("File harus berupa gambar (PNG/JPG).");
      return;
    }
    if (file.size > MAX_ORIGINAL_FILE_MB * 1024 * 1024) {
      setError(`Ukuran file terlalu besar (maks ${MAX_ORIGINAL_FILE_MB} MB). Kompres dulu atau pakai gambar lain.`);
      return;
    }

    setUploading(true);
    const supabase = createClient();

    let resizedBlob: Blob;
    try {
      resizedBlob = await resizeImage(file, MAX_DIMENSION_SERTIFIKAT);
    } catch (err) {
      setUploading(false);
      setError(err instanceof Error ? err.message : "Gagal memproses gambar.");
      return;
    }

    const path = "background_sertifikat.png";
    const { error: uploadError } = await supabase.storage
      .from("logos")
      .upload(path, resizedBlob, { upsert: true, contentType: "image/png" });

    if (uploadError) {
      setUploading(false);
      setError(uploadError.message);
      return;
    }

    const { data: publicUrlData } = supabase.storage.from("logos").getPublicUrl(path);
    // Tambahkan timestamp supaya browser tidak menampilkan cache gambar lama
    const urlWithCacheBust = `${publicUrlData.publicUrl}?t=${Date.now()}`;

    const { error: dbError } = await supabase
      .from("pengaturan_skl")
      .upsert({ id: 1, background_sertifikat_url: urlWithCacheBust });

    setUploading(false);
    if (dbError) {
      setError(dbError.message);
      return;
    }

    setBackgroundUrl(urlWithCacheBust);
  }

  return (
    <div className="max-w-none">
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg px-3 py-2 mb-4">
          {error}
        </p>
      )}

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">Background Sertifikat</p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">
          Gambar latar penuh satu halaman untuk Cetak Sertifikat -- otomatis diperkecil ke maks{" "}
          {MAX_DIMENSION_SERTIFIKAT}px pada sisi terpanjang (ukuran asli maks {MAX_ORIGINAL_FILE_MB} MB).
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">
          Sertifikat akan dicetak di kertas A4 Landscape dengan margin penuh (kiri, kanan, atas, bawah = 0), jadi
          sebaiknya gunakan gambar dengan rasio 297 x 210 mm (landscape) supaya tidak gepeng/terpotong.
        </p>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400 dark:text-slate-500" />
          </div>
        ) : (
          <div
            onClick={() => inputRef.current?.click()}
            className="aspect-[297/210] w-full max-w-2xl rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 dark:hover:bg-indigo-500/10 transition-colors relative overflow-hidden"
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
            ) : backgroundUrl ? (
              <Image src={backgroundUrl} alt="Background Sertifikat" fill className="object-contain p-2" />
            ) : (
              <div className="flex flex-col items-center text-slate-400 dark:text-slate-500">
                <Upload className="h-5 w-5 mb-1" />
                <span className="text-xs">Upload gambar background (297 x 210 mm)</span>
              </div>
            )}
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
          }}
        />
      </div>
    </div>
  );
}

export default function PengaturanSklPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("pengaturan");

  return (
    <div className="p-6 md:p-8 dark:bg-slate-900 min-h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Pengaturan SKL</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Bobot nilai, nomor surat, dan nomor seri ijazah untuk SKL (Surat Keterangan Lulus)
        </p>
      </div>

      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700 mb-6">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === t.key
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "pengaturan" && <PengaturanTab />}
      {activeTab === "nomor-unik" && <NomorUnikTab />}
      {activeTab === "nomor-sertifikat" && <NomorSertifikatTab />}
      {activeTab === "background-sertifikat" && <BackgroundSertifikatTab />}
    </div>
  );
}
