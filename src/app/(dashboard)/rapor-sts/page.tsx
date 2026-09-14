"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useRole } from "@/lib/role-context";
import { compareKelas } from "@/lib/rekap-siswa";
import {
  getFase,
  formatTanggalIndonesia,
  isValidNip,
  fetchWaliKelasInfo,
  hitungRingkasanSiswa,
  hitungPeringkat,
  SiswaRingkasNilai,
  MapelRingkas,
  RingkasanSiswa,
  WaliKelasInfo,
} from "@/lib/rapor-sts";
import { getTahunAjaranSaatIni, getSemesterSaatIni, Nilai } from "@/types/nilai";
import { ProfilSekolah } from "@/types/sekolah";
import { Loader2, Printer } from "lucide-react";

type SiswaRingkas = SiswaRingkasNilai;

export default function RaporStsPage() {
  const { role, waliKelasRombel } = useRole();
  const isFullAccessRole = role === "admin" || role === "kepala_sekolah";

  const [rombelOptions, setRombelOptions] = useState<string[]>([]);
  const [selectedRombel, setSelectedRombel] = useState<string>("");
  const [semester, setSemester] = useState<"Ganjil" | "Genap">(getSemesterSaatIni());
  const [tahunAjaran, setTahunAjaran] = useState(getTahunAjaranSaatIni());

  const [profil, setProfil] = useState<ProfilSekolah | null>(null);
  const [tanggalCetakRapor, setTanggalCetakRapor] = useState<string | null>(null);
  const [waliKelasInfo, setWaliKelasInfo] = useState<WaliKelasInfo | null>(null);
  const [ringkasanList, setRingkasanList] = useState<RingkasanSiswa[]>([]);
  const [selectedSiswaId, setSelectedSiswaId] = useState<string>("");
  const [printMode, setPrintMode] = useState<"single" | "all">("single");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Ambil default tahun ajaran & semester aktif
  useEffect(() => {
    async function fetchDefaultPeriode() {
      const supabase = createClient();
      const { data } = await supabase
        .from("pengaturan_akademik")
        .select("tahun_ajaran, semester")
        .eq("id", 1)
        .maybeSingle();
      if (data) {
        setTahunAjaran(data.tahun_ajaran);
        setSemester(data.semester);
      }
    }
    fetchDefaultPeriode();
  }, []);

  // Tentukan rombel: wali kelas -> otomatis kelasnya sendiri; admin/kepsek -> pilih
  useEffect(() => {
    async function initRombel() {
      const supabase = createClient();
      if (waliKelasRombel) {
        setSelectedRombel(waliKelasRombel);
      } else if (isFullAccessRole) {
        const { data } = await supabase.from("siswa01").select("rombel").not("rombel", "is", null);
        const unique = Array.from(new Set((data ?? []).map((r) => r.rombel).filter(Boolean) as string[])).sort(
          compareKelas
        );
        setRombelOptions(unique);
        if (unique.length > 0) setSelectedRombel(unique[0]);
      }
    }
    initRombel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waliKelasRombel, isFullAccessRole]);

  const loadData = useCallback(async () => {
    if (!selectedRombel) return;
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const [profilRes, waliKelasInfoResult, siswaRes, gmkRes, panitiaRes] = await Promise.all([
      supabase.from("profil_sekolah").select("*").eq("id", 1).maybeSingle(),
      fetchWaliKelasInfo(supabase, selectedRombel),
      supabase
        .from("siswa01")
        .select("id, nama, nipd, nisn, agama")
        .eq("rombel", selectedRombel)
        .eq("status_siswa", "Aktif")
        .order("nama", { ascending: true }),
      supabase.from("guru_mengajar_kelas").select("mapel_id").eq("rombel", selectedRombel),
      supabase
        .from("panitia_pts_pas")
        .select("tanggal_cetak_rapor")
        .eq("tahun_ajaran", tahunAjaran)
        .eq("semester", semester)
        .eq("jenis", "PTS")
        .maybeSingle(),
    ]);

    if (siswaRes.error) {
      setError(siswaRes.error.message);
      setLoading(false);
      return;
    }

    setProfil(profilRes.data ?? null);
    setTanggalCetakRapor(panitiaRes.data?.tanggal_cetak_rapor ?? null);
    setWaliKelasInfo(waliKelasInfoResult);

    const mapelIds = Array.from(new Set((gmkRes.data ?? []).map((g) => g.mapel_id)));
    const { data: pelajaranData } = mapelIds.length
      ? await supabase.from("pelajaran").select("id, mapel").in("id", mapelIds).order("id", { ascending: true })
      : { data: [] as MapelRingkas[] };

    const mapelList: MapelRingkas[] = pelajaranData ?? [];
    const siswaList: SiswaRingkas[] = siswaRes.data ?? [];

    let nilaiRows: Nilai[] = [];
    if (mapelIds.length > 0 && siswaList.length > 0) {
      const { data: nRows, error: nError } = await supabase
        .from("nilai")
        .select("*")
        .eq("rombel", selectedRombel)
        .eq("tahun_ajaran", tahunAjaran)
        .eq("semester", semester)
        .in("mapel_id", mapelIds);

      if (nError) {
        setError(nError.message);
        setLoading(false);
        return;
      }
      nilaiRows = nRows ?? [];
    }

    // Nilai per siswa per mapel: nilai STS murni (tertinggi antara STS/Susulan/Remedial),
    // mapel Agama digabung satu baris, lalu peringkat dihitung dari rata-rata.
    const summaries = hitungRingkasanSiswa(siswaList, mapelList, nilaiRows);
    const finalSummaries = hitungPeringkat(summaries);

    setRingkasanList(finalSummaries);
    // Pertahankan siswa yang sedang dipilih kalau masih ada di daftar (mis.
    // cuma ganti tahun ajaran/semester untuk rombel yang sama); kalau tidak
    // ada lagi (mis. baru ganti rombel), default ke siswa pertama.
    setSelectedSiswaId((prev) => {
      if (finalSummaries.some((r) => r.siswa.id === prev)) return prev;
      return finalSummaries[0]?.siswa.id ?? "";
    });

    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRombel, tahunAjaran, semester]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalSiswaKelas = ringkasanList.length;

  function handlePrintSingle() {
    setPrintMode("single");
    setTimeout(() => window.print(), 50);
  }

  function handlePrintAll() {
    setPrintMode("all");
    setTimeout(() => window.print(), 50);
  }

  const kotaKode = useMemo(() => {
    const kota = profil?.kota_kabupaten || "";
    return kota.toUpperCase().split("").join(" ");
  }, [profil]);

  // Tanggal cetak diambil dari panitia_pts_pas.tanggal_cetak_rapor (jenis
  // PTS) untuk tahun ajaran & semester yang dipilih -- jatuh ke tanggal
  // hari ini kalau panitia belum menentukannya.
  const tanggalCetak = tanggalCetakRapor ? new Date(`${tanggalCetakRapor}T00:00:00`) : new Date();

  function RaporCard({ data }: { data: RingkasanSiswa }) {
    return (
      <div className="bg-white text-slate-900 border border-slate-200 rounded-xl p-8 mb-8 print:border-0 print:rounded-none print:mb-0 print:break-after-page">
        {/* Kop surat */}
        <div className="flex items-center gap-4 pb-3 border-b-2 border-slate-800 mb-4">
          <div className="h-20 w-20 relative shrink-0">
            {profil?.logo_dinas_url && (
              <Image src={profil.logo_dinas_url} alt="Logo Dinas" fill className="object-contain" />
            )}
          </div>
          <div className="flex-1 text-center">
            <p className="text-sm">{profil?.header_baris1}</p>
            <p className="text-sm">{profil?.header_baris2}</p>
            <p className="text-lg font-bold">{profil?.nama_sekolah}</p>
            <p className="text-xs">{profil?.alamat}</p>
            <p className="text-xs">
              Website : {profil?.website} email: {profil?.email}
            </p>
            <p className="text-xs tracking-widest">
              {kotaKode} {profil?.kode_pos}
            </p>
          </div>
          <div className="h-20 w-20 relative shrink-0">
            {profil?.logo_sekolah_url && (
              <Image src={profil.logo_sekolah_url} alt="Logo Sekolah" fill className="object-contain" />
            )}
          </div>
        </div>

        <p className="text-center font-semibold mb-4">
          LAPORAN HASIL BELAJAR
          <br />
          SUMATIF TENGAH SEMESTER
        </p>

        {/* Info siswa -- kolom kiri dilebarkan (bukan 50/50) supaya nama
            siswa yang panjang tetap muat satu baris. */}
        <div className="grid grid-cols-[2fr_1fr] gap-x-[170px] text-sm mb-4">
          {/* w-fit -- tabel adalah grid item, defaultnya justify-self:stretch
              melebarkannya ke seluruh lebar kolom grid, membuat label dan
              nilai berjauhan; w-fit mengembalikannya ke lebar sesuai isi. */}
          <table className="w-fit">
            <tbody>
              <tr>
                <td className="py-0.5 pr-3 whitespace-nowrap">Nama Siswa</td>
                <td className="py-0.5">: {data.siswa.nama}</td>
              </tr>
              <tr>
                <td className="py-0.5 pr-3 whitespace-nowrap">N I S</td>
                <td className="py-0.5">: {data.siswa.nipd || "-"}</td>
              </tr>
              <tr>
                <td className="py-0.5 pr-3 whitespace-nowrap">N I S N</td>
                <td className="py-0.5">: {data.siswa.nisn || "-"}</td>
              </tr>
            </tbody>
          </table>
          <table className="w-fit">
            <tbody>
              <tr>
                <td className="py-0.5 pr-3 whitespace-nowrap">Kelas / Fase</td>
                <td className="py-0.5">
                  : {selectedRombel} / {getFase(selectedRombel)}
                </td>
              </tr>
              <tr>
                <td className="py-0.5 pr-3 whitespace-nowrap">Semester</td>
                <td className="py-0.5">: {semester.toUpperCase()}</td>
              </tr>
              <tr>
                <td className="py-0.5 pr-3 whitespace-nowrap">Tahun Pelajaran</td>
                <td className="py-0.5">: {tahunAjaran.replace("/", " / ")}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Tabel nilai */}
        <table className="w-full text-sm border border-slate-800 mb-4">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="border-r border-slate-800 px-2 py-1.5 w-10">No</th>
              <th className="border-r border-slate-800 px-2 py-1.5 text-left">Muatan Pelajaran</th>
              <th className="border-r border-slate-800 px-2 py-1.5 w-20">Nilai</th>
              <th className="px-2 py-1.5 w-24">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {data.baris.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-4 text-slate-400">
                  Belum ada mapel yang diajarkan di kelas ini.
                </td>
              </tr>
            ) : (
              data.baris.map((b, idx) => (
                <tr key={b.mapel} className="border-b border-slate-300 last:border-0">
                  <td className="border-r border-slate-800 px-2 py-1 text-center">{idx + 1}</td>
                  <td className="border-r border-slate-800 px-2 py-1">{b.mapel}</td>
                  <td className="border-r border-slate-800 px-2 py-1 text-center">
                    {b.nilai ?? "-"}
                  </td>
                  <td className="px-2 py-1 text-center">{b.keterangan}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Ringkasan nilai -- Total Nilai kiri, Rata-rata tengah, Peringkat kanan */}
        <div className="grid grid-cols-3 border border-slate-800 px-4 py-1.5 text-sm mb-8">
          <p className="text-left">Total Nilai : {data.total ?? "-"}</p>
          <p className="text-center">Rata - rata: {data.rataRata ?? "-"}</p>
          <p className="text-right">
            Peringkat : {data.peringkat ?? "-"} dari {totalSiswaKelas} murid
          </p>
        </div>

        {/* Tanggapan orang tua */}
        <div className="border border-slate-800 mb-8">
          <p className="text-center text-sm py-1.5 border-b border-slate-800">
            Tanggapan Orang Tua / Wali Murid
          </p>
          <div className="h-24" />
        </div>

        {/* Tanda tangan */}
        <div className="grid grid-cols-3 gap-6 text-sm">
          <div className="text-center">
            <p>Orang Tua / Wali Murid,</p>
            <div className="h-16" />
            <p>_____________________</p>
          </div>
          <div />
          <div className="text-center">
            <p>
              {profil?.kota_kabupaten || "Tarakan"}, {formatTanggalIndonesia(tanggalCetak)}
            </p>
            <p>Wali Kelas,</p>
            <div className="h-14" />
            <p className="underline">{waliKelasInfo?.nama || "________________"}</p>
            {waliKelasInfo?.nip && isValidNip(waliKelasInfo.nip) && (
              <p>
                {waliKelasInfo.label}. {waliKelasInfo.nip}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  const dataToPrint = ringkasanList.find((r) => r.siswa.id === selectedSiswaId) ?? null;

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto print:p-0 print:max-w-none">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 print:hidden">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Cetak Rapor STS</h1>
        <div className="flex gap-2">
          <button
            onClick={handlePrintSingle}
            disabled={!dataToPrint}
            className="inline-flex items-center gap-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
          >
            <Printer className="h-4 w-4" />
            Cetak Siswa Ini
          </button>
          <button
            onClick={handlePrintAll}
            disabled={ringkasanList.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white text-sm font-medium px-3 py-2 hover:bg-indigo-700 disabled:opacity-50"
          >
            <Printer className="h-4 w-4" />
            Cetak Semua Siswa
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-5 print:hidden">
        {isFullAccessRole && (
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
          value={semester}
          onChange={(e) => setSemester(e.target.value as "Ganjil" | "Genap")}
          className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="Ganjil">Semester Ganjil</option>
          <option value="Genap">Semester Genap</option>
        </select>

        <input
          value={tahunAjaran}
          onChange={(e) => setTahunAjaran(e.target.value)}
          className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm w-32 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />

        <select
          value={selectedSiswaId}
          onChange={(e) => setSelectedSiswaId(e.target.value)}
          className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {ringkasanList.map((r) => (
            <option key={r.siswa.id} value={r.siswa.id}>
              {r.siswa.nama}
            </option>
          ))}
        </select>
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
      ) : ringkasanList.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-10 text-center text-slate-400 dark:text-slate-500 print:hidden">
          Tidak ada siswa aktif di kelas ini.
        </div>
      ) : printMode === "all" ? (
        ringkasanList.map((r) => <RaporCard key={r.siswa.id} data={r} />)
      ) : (
        dataToPrint && <RaporCard data={dataToPrint} />
      )}
    </div>
  );
}
