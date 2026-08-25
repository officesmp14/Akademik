"use client";

import { useCallback, useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/client";
import { useRole } from "@/lib/role-context";
import { compareKelas } from "@/lib/rekap-siswa";
import { getTahunAjaranSaatIni } from "@/types/nilai";
import { BULAN_GANJIL, BULAN_GENAP } from "@/types/hari-efektif";
import { StatusPresensi } from "@/types/presensi";
import { ProfilSekolah } from "@/types/sekolah";
import { ChevronLeft, Loader2, Printer, Download } from "lucide-react";

type SiswaVerifikasi = {
  id: string;
  nik: string | null;
  nisn: string | null;
  nama: string | null;
  rombel: string | null;
  nama_ibu: string | null;
  ibu_nik: string | null;
};

type PresensiRingkas = { siswa_id: string; tanggal: string; status: StatusPresensi };

const BULAN_URUT = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "Nopember", "Desember",
];

function todayBulanName() {
  return BULAN_URUT[new Date().getMonth()];
}

function bulanNumber(bulan: string) {
  return BULAN_URUT.indexOf(bulan) + 1;
}

function yearForBulan(tahunAjaran: string, bulan: string): number | null {
  const parts = tahunAjaran.split("/").map((p) => parseInt(p.trim(), 10));
  if (parts.length !== 2 || parts.some((n) => Number.isNaN(n))) return null;
  const [awal, akhir] = parts;
  return BULAN_GANJIL.includes(bulan) ? awal : akhir;
}

function dateRangeForBulan(tahunAjaran: string, bulan: string): { start: string; end: string } | null {
  const year = yearForBulan(tahunAjaran, bulan);
  if (!year) return null;
  const month = bulanNumber(bulan);
  const pad = (n: number) => String(n).padStart(2, "0");
  const start = `${year}-${pad(month)}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${pad(month)}-${pad(lastDay)}`;
  return { start, end };
}

function kategoriStatus(status: StatusPresensi): "ALPA" | "IZIN" | "SAKIT" | null {
  if (status === "A" || status === "M") return "ALPA";
  if (status === "I" || status === "P" || status === "D") return "IZIN";
  if (status === "S") return "SAKIT";
  return null;
}

export default function VerifikasiPresensiPage() {
  const { role, waliKelasRombel } = useRole();
  const isFullAccessRole = role === "admin" || role === "kepala_sekolah";
  const lockedToOwnClass = !isFullAccessRole && Boolean(waliKelasRombel);

  const [profil, setProfil] = useState<{ npsn: string | null; nama_sekolah: string | null }>({
    npsn: null,
    nama_sekolah: null,
  });
  const [tahunAjaran, setTahunAjaran] = useState(getTahunAjaranSaatIni());
  const [selectedBulan, setSelectedBulan] = useState(todayBulanName());
  const [rombelOptions, setRombelOptions] = useState<string[]>([]);
  const [selectedRombel, setSelectedRombel] = useState("");

  const [hariEfektif, setHariEfektif] = useState<number | null>(null);
  const [siswaList, setSiswaList] = useState<SiswaVerifikasi[]>([]);
  const [presensiRows, setPresensiRows] = useState<PresensiRingkas[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProfil() {
      const supabase = createClient();
      const { data } = await supabase
        .from("profil_sekolah")
        .select("npsn, nama_sekolah")
        .eq("id", 1)
        .maybeSingle<ProfilSekolah>();
      if (data) setProfil({ npsn: data.npsn, nama_sekolah: data.nama_sekolah });
    }
    fetchProfil();
  }, []);

  useEffect(() => {
    async function fetchDefaultPeriode() {
      const supabase = createClient();
      const { data } = await supabase
        .from("pengaturan_akademik")
        .select("tahun_ajaran")
        .eq("id", 1)
        .maybeSingle();
      if (data) setTahunAjaran(data.tahun_ajaran);
    }
    fetchDefaultPeriode();
  }, []);

  useEffect(() => {
    async function initRombel() {
      if (lockedToOwnClass) {
        setSelectedRombel(waliKelasRombel!);
        return;
      }
      if (isFullAccessRole) {
        const supabase = createClient();
        const { data } = await supabase.from("siswa01").select("rombel").eq("status_siswa", "Aktif").not("rombel", "is", null);
        const unique = Array.from(new Set((data ?? []).map((r) => r.rombel).filter(Boolean) as string[])).sort(compareKelas);
        setRombelOptions(unique);
        if (unique.length > 0) setSelectedRombel(unique[0]);
        else setLoading(false);
      } else {
        setLoading(false);
      }
    }
    initRombel();
  }, [lockedToOwnClass, isFullAccessRole, waliKelasRombel]);

  const fetchData = useCallback(async () => {
    if (!selectedRombel || !tahunAjaran || !selectedBulan) return;
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const range = dateRangeForBulan(tahunAjaran, selectedBulan);

    const [siswaRes, hariEfektifRes, presensiRes] = await Promise.all([
      supabase
        .from("siswa01")
        .select("id, nik, nisn, nama, rombel, nama_ibu, ibu_nik")
        .eq("rombel", selectedRombel)
        .eq("status_siswa", "Aktif")
        .order("nama", { ascending: true }),
      supabase
        .from("hari_efektif_bulanan")
        .select("jumlah_hari")
        .eq("tahun_ajaran", tahunAjaran)
        .eq("bulan", selectedBulan)
        .maybeSingle(),
      range
        ? supabase
            .from("presensi")
            .select("siswa_id, tanggal, status")
            .eq("rombel", selectedRombel)
            .gte("tanggal", range.start)
            .lte("tanggal", range.end)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (siswaRes.error) {
      setError(siswaRes.error.message);
      setLoading(false);
      return;
    }
    if (presensiRes.error) {
      setError(presensiRes.error.message);
      setLoading(false);
      return;
    }

    setSiswaList((siswaRes.data ?? []) as SiswaVerifikasi[]);
    setHariEfektif(hariEfektifRes.data?.jumlah_hari ?? null);
    setPresensiRows((presensiRes.data ?? []) as PresensiRingkas[]);
    setLoading(false);
  }, [selectedRombel, tahunAjaran, selectedBulan]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = "@page { size: landscape; margin: 10mm; }";
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  function hitungSiswa(siswaId: string) {
    const alpaDates = new Set<string>();
    const izinDates = new Set<string>();
    const sakitDates = new Set<string>();
    for (const p of presensiRows) {
      if (p.siswa_id !== siswaId) continue;
      const kat = kategoriStatus(p.status);
      if (kat === "ALPA") alpaDates.add(p.tanggal);
      else if (kat === "IZIN") izinDates.add(p.tanggal);
      else if (kat === "SAKIT") sakitDates.add(p.tanggal);
    }
    const alpa = alpaDates.size;
    const izin = izinDates.size;
    const sakit = sakitDates.size;
    const jml = alpa + izin + sakit;
    const persen = hariEfektif && hariEfektif > 0 ? Math.round((jml / hariEfektif) * 1000) / 10 : null;
    return { alpa, izin, sakit, jml, persen };
  }

  function handleDownload() {
    const data = siswaList.map((s, idx) => {
      const h = hitungSiswa(s.id);
      return {
        NO: idx + 1,
        "NIK PENGURUS": s.ibu_nik || "",
        "NAMA PENGURUS": s.nama_ibu || "",
        "NIK SISWA": s.nik || "",
        NISN: s.nisn || "",
        "NAMA SISWA": s.nama || "",
        "BENTUK PENDIDIKAN": "SMP",
        "TINGKAT PENDIDIKAN": s.rombel || "",
        [`${selectedBulan.toUpperCase()} - HARI EFEKTIF`]: hariEfektif ?? "",
        ALPA: h.alpa,
        IZIN: h.izin,
        SAKIT: h.sakit,
        JML: h.jml,
        "%": h.persen ?? "",
        KET: "",
        "NAMA PENDAMPING": "",
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Verifikasi Presensi");
    XLSX.writeFile(wb, `Verifikasi-Presensi-${selectedRombel}-${selectedBulan}.xlsx`);
  }

  const noAccess = !isFullAccessRole && !lockedToOwnClass && rombelOptions.length === 0 && !loading;

  return (
    <div className="p-6 md:p-8 max-w-full mx-auto print:p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 print:hidden">
        <a
          href="/laporan"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
        >
          <ChevronLeft className="h-4 w-4" />
          Kembali ke Laporan
        </a>
        {!loading && siswaList.length > 0 && (
          <div className="flex gap-2">
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              Download Excel
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white text-sm font-medium px-4 py-2 hover:bg-indigo-700 transition-colors"
            >
              <Printer className="h-4 w-4" />
              Cetak
            </button>
          </div>
        )}
      </div>

      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-1 print:hidden">
        Verifikasi Presensi
      </h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 print:hidden">
        Rekap Alpa/Izin/Sakit per siswa per bulan, dihitung per hari, untuk kebutuhan verifikasi ke
        Dinas Pendidikan
      </p>

      {noAccess ? (
        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-6">
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Anda bukan wali kelas. Hubungi admin untuk mengatur akses laporan ini.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3 mb-5 print:hidden">
            {!lockedToOwnClass && (
              <select
                value={selectedRombel}
                onChange={(e) => setSelectedRombel(e.target.value)}
                className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {rombelOptions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            )}

            <select
              value={selectedBulan}
              onChange={(e) => setSelectedBulan(e.target.value)}
              className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <optgroup label="Semester Ganjil">
                {BULAN_GANJIL.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Semester Genap">
                {BULAN_GENAP.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </optgroup>
            </select>

            <input
              value={tahunAjaran}
              onChange={(e) => setTahunAjaran(e.target.value)}
              className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm w-32 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="2026/2027"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg px-3 py-2 mb-4 print:hidden">
              {error}
            </p>
          )}

          {loading ? (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-10 flex justify-center print:hidden">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400 dark:text-slate-500" />
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-x-auto p-4 print:border-0 print:p-0">
              <div className="mb-4 text-slate-900 dark:text-slate-100">
                <p className="font-semibold uppercase">Form Verifikasi Komitmen Pendidikan</p>
                <p className="text-sm mt-2">NPSN : {profil.npsn || "-"}</p>
                <p className="text-sm">Nama Sekolah : {profil.nama_sekolah || "-"}</p>
              </div>

              <table className="text-xs whitespace-nowrap border-collapse w-full">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-700/40 text-slate-600 dark:text-slate-300">
                    <th rowSpan={3} className="border border-slate-300 dark:border-slate-600 px-2 py-1.5">No</th>
                    <th rowSpan={3} className="border border-slate-300 dark:border-slate-600 px-2 py-1.5">NIK Pengurus</th>
                    <th rowSpan={3} className="border border-slate-300 dark:border-slate-600 px-2 py-1.5">Nama Pengurus</th>
                    <th rowSpan={3} className="border border-slate-300 dark:border-slate-600 px-2 py-1.5">NIK Siswa</th>
                    <th rowSpan={3} className="border border-slate-300 dark:border-slate-600 px-2 py-1.5">NISN</th>
                    <th rowSpan={3} className="border border-slate-300 dark:border-slate-600 px-2 py-1.5">Nama Siswa</th>
                    <th rowSpan={3} className="border border-slate-300 dark:border-slate-600 px-2 py-1.5">Bentuk Pendidikan</th>
                    <th rowSpan={3} className="border border-slate-300 dark:border-slate-600 px-2 py-1.5">Tingkat Pendidikan</th>
                    <th colSpan={5} className="border border-slate-300 dark:border-slate-600 px-2 py-1.5 text-center">
                      {selectedBulan.toUpperCase()}
                    </th>
                    <th rowSpan={3} className="border border-slate-300 dark:border-slate-600 px-2 py-1.5">Ket</th>
                    <th rowSpan={3} className="border border-slate-300 dark:border-slate-600 px-2 py-1.5">Nama Pendamping</th>
                  </tr>
                  <tr className="bg-slate-50 dark:bg-slate-700/40 text-slate-600 dark:text-slate-300">
                    <th colSpan={5} className="border border-slate-300 dark:border-slate-600 px-2 py-1.5 text-center">
                      Hari Efektif : {hariEfektif ?? "-"}
                    </th>
                  </tr>
                  <tr className="bg-slate-50 dark:bg-slate-700/40 text-slate-600 dark:text-slate-300">
                    <th className="border border-slate-300 dark:border-slate-600 px-2 py-1">Alpa</th>
                    <th className="border border-slate-300 dark:border-slate-600 px-2 py-1">Izin</th>
                    <th className="border border-slate-300 dark:border-slate-600 px-2 py-1">Sakit</th>
                    <th className="border border-slate-300 dark:border-slate-600 px-2 py-1">Jml</th>
                    <th className="border border-slate-300 dark:border-slate-600 px-2 py-1">%</th>
                  </tr>
                </thead>
                <tbody>
                  {siswaList.length === 0 ? (
                    <tr>
                      <td colSpan={15} className="border border-slate-300 dark:border-slate-600 px-2 py-8 text-center text-slate-400 dark:text-slate-500">
                        Tidak ada siswa aktif di kelas ini.
                      </td>
                    </tr>
                  ) : (
                    siswaList.map((s, idx) => {
                      const h = hitungSiswa(s.id);
                      return (
                        <tr key={s.id} className="text-slate-700 dark:text-slate-200">
                          <td className="border border-slate-300 dark:border-slate-600 px-2 py-1.5 text-center">{idx + 1}</td>
                          <td className="border border-slate-300 dark:border-slate-600 px-2 py-1.5">{s.ibu_nik || "-"}</td>
                          <td className="border border-slate-300 dark:border-slate-600 px-2 py-1.5">{s.nama_ibu || "-"}</td>
                          <td className="border border-slate-300 dark:border-slate-600 px-2 py-1.5">{s.nik || "-"}</td>
                          <td className="border border-slate-300 dark:border-slate-600 px-2 py-1.5">{s.nisn || "-"}</td>
                          <td className="border border-slate-300 dark:border-slate-600 px-2 py-1.5 font-medium">{s.nama || "-"}</td>
                          <td className="border border-slate-300 dark:border-slate-600 px-2 py-1.5 text-center">SMP</td>
                          <td className="border border-slate-300 dark:border-slate-600 px-2 py-1.5 text-center">{s.rombel || "-"}</td>
                          <td className="border border-slate-300 dark:border-slate-600 px-2 py-1.5 text-center">{h.alpa || "-"}</td>
                          <td className="border border-slate-300 dark:border-slate-600 px-2 py-1.5 text-center">{h.izin || "-"}</td>
                          <td className="border border-slate-300 dark:border-slate-600 px-2 py-1.5 text-center">{h.sakit || "-"}</td>
                          <td className="border border-slate-300 dark:border-slate-600 px-2 py-1.5 text-center">{h.jml || "-"}</td>
                          <td className="border border-slate-300 dark:border-slate-600 px-2 py-1.5 text-center">
                            {h.persen === null ? "-" : `${h.persen}%`}
                          </td>
                          <td className="border border-slate-300 dark:border-slate-600 px-2 py-1.5"></td>
                          <td className="border border-slate-300 dark:border-slate-600 px-2 py-1.5"></td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
