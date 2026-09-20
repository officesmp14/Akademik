"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useRole } from "@/lib/role-context";
import { compareKelas } from "@/lib/rekap-siswa";
import { getFase, formatTanggalIndonesia, isValidNip, fetchWaliKelasInfo, WaliKelasInfo } from "@/lib/rapor-sts";
import { getTahunAjaranSaatIni, getSemesterSaatIni } from "@/types/nilai";
import { SEMUA_KOLOM_UJIAN, KolomUjianKey } from "@/types/nilai-ujian-sekolah";
import {
  fetchNilaiRekapData,
  formatNilai,
  getTotalNilai,
  hitungJumlahRataRata,
  hitungRank,
  NilaiRekapData,
  SiswaRekap,
} from "@/lib/nilai-rekap";
import { ProfilSekolah } from "@/types/sekolah";
import { Loader2, Printer } from "lucide-react";

const EMPTY_DATA: NilaiRekapData = { siswaList: [], bobotRapor: null, rataRataMap: {}, ujianSklMap: {} };

// Nama resmi mata pelajaran untuk ijazah -- beda dari label singkat yang
// dipakai di tabel input Nilai Ujian Sekolah.
const MAPEL_LABEL_IJAZAH: Record<KolomUjianKey, string> = {
  agama: "Pendidikan Agama dan Budi Pekerti",
  pkn: "Pendidikan Kewarganegaraan",
  bind: "Bahasa Indonesia",
  mtk: "Matematika",
  ipa: "Ilmu Pengetahuan Alam (IPA)",
  ips: "Ilmu Pengetahuan Sosial (IPS)",
  bing: "Bahasa Inggris",
  pjok: "Pendidikan Jasmani dan Olahraga",
  prakarya: "Prakarya",
  informatika: "Informatika",
};

export default function CetakNilaiIjazahPage() {
  const { role, waliKelasRombel, moduleAccess } = useRole();
  const isFullAccessRole = role === "admin" || role === "kepala_sekolah";
  const hasModuleEdit = moduleAccess.some((a) => a.module === "cetak_nilai_ijazah" && a.can_edit);
  const fullSelectAccess = isFullAccessRole || hasModuleEdit;

  const [selectedRombel, setSelectedRombel] = useState("");
  const [kelasOptions, setKelasOptions] = useState<string[]>([]);
  const [tahunAjaran, setTahunAjaran] = useState(getTahunAjaranSaatIni());
  const [semester, setSemester] = useState<"Ganjil" | "Genap">(getSemesterSaatIni());
  const [selectedSiswaId, setSelectedSiswaId] = useState("");
  const [printMode, setPrintMode] = useState<"single" | "all">("single");

  const [profil, setProfil] = useState<ProfilSekolah | null>(null);
  const [waliKelasInfo, setWaliKelasInfo] = useState<WaliKelasInfo | null>(null);
  const [tanggalCetakSkl, setTanggalCetakSkl] = useState<string | null>(null);
  const [data, setData] = useState<NilaiRekapData>(EMPTY_DATA);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tentukan rombel: wali kelas -> otomatis kelasnya sendiri; admin/kepsek -> pilih
  useEffect(() => {
    async function initRombel() {
      const supabase = createClient();
      if (waliKelasRombel) {
        setSelectedRombel(waliKelasRombel);
      } else if (fullSelectAccess) {
        const { data: rows } = await supabase
          .from("siswa01")
          .select("rombel")
          .like("rombel", "IX.%")
          .eq("status_siswa", "Aktif");
        const unique = Array.from(
          new Set((rows ?? []).map((r) => r.rombel).filter(Boolean) as string[])
        ).sort(compareKelas);
        setKelasOptions(unique);
        if (unique.length > 0) setSelectedRombel(unique[0]);
      }
    }
    initRombel();
  }, [waliKelasRombel, fullSelectAccess]);

  const loadData = useCallback(async () => {
    if (!selectedRombel) return;
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const [profilRes, waliKelasInfoResult, pengaturanRes, rekapRes] = await Promise.all([
      supabase.from("profil_sekolah").select("*").eq("id", 1).maybeSingle(),
      fetchWaliKelasInfo(supabase, selectedRombel),
      supabase.from("pengaturan_skl").select("tanggal_cetak_skl").eq("id", 1).maybeSingle(),
      fetchNilaiRekapData(supabase, { tahunAjaran, kelasFilter: selectedRombel }),
    ]);

    setProfil(profilRes.data ?? null);
    setWaliKelasInfo(waliKelasInfoResult);
    setTanggalCetakSkl(pengaturanRes.data?.tanggal_cetak_skl ?? null);
    setData(rekapRes.data);
    setError(rekapRes.error);
    setLoading(false);

    setSelectedSiswaId((prev) => {
      if (rekapRes.data.siswaList.some((s) => s.id === prev)) return prev;
      return rekapRes.data.siswaList[0]?.id ?? "";
    });
  }, [selectedRombel, tahunAjaran]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  // Tanggal cetak diambil dari pengaturan_skl.tanggal_cetak_skl -- jatuh ke
  // tanggal hari ini kalau belum ditentukan.
  const tanggalCetak = tanggalCetakSkl ? new Date(`${tanggalCetakSkl}T00:00:00`) : new Date();

  const nisnList = data.siswaList.filter((s) => s.nisn).map((s) => s.nisn as string);
  const rankMap = hitungRank(nisnList, data);
  const totalSiswaKelas = data.siswaList.length;

  function IjazahCard({ s }: { s: SiswaRekap }) {
    const { jumlah, rataRata } = s.nisn ? hitungJumlahRataRata(data, s.nisn) : { jumlah: null, rataRata: null };
    const rank = s.nisn ? rankMap.get(s.nisn) ?? null : null;

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

        <p className="text-center font-semibold mb-4">NILAI IJAZAH</p>

        {/* Info siswa */}
        <div className="grid grid-cols-[2fr_1fr] gap-x-12 text-sm mb-4">
          <table className="w-fit">
            <tbody>
              <tr>
                <td className="py-0.5 pr-3 whitespace-nowrap">Nama Siswa</td>
                <td className="py-0.5">: {s.nama}</td>
              </tr>
              <tr>
                <td className="py-0.5 pr-3 whitespace-nowrap">NIS</td>
                <td className="py-0.5">: {s.nipd || "-"}</td>
              </tr>
              <tr>
                <td className="py-0.5 pr-3 whitespace-nowrap">NISN</td>
                <td className="py-0.5">: {s.nisn || "-"}</td>
              </tr>
            </tbody>
          </table>
          <table className="w-fit">
            <tbody>
              <tr>
                <td className="py-0.5 pr-3 whitespace-nowrap">Tahun Pelajaran</td>
                <td className="py-0.5">: {tahunAjaran}</td>
              </tr>
              <tr>
                <td className="py-0.5 pr-3 whitespace-nowrap">Semester</td>
                <td className="py-0.5">: {semester}</td>
              </tr>
              <tr>
                <td className="py-0.5 pr-3 whitespace-nowrap">Kelas/Fase</td>
                <td className="py-0.5">
                  : {s.rombel} / {getFase(s.rombel || "")}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Tabel nilai */}
        <table className="w-full text-sm border border-slate-800 mb-4">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="border-r border-slate-800 px-2 py-1.5 w-10">No</th>
              <th className="border-r border-slate-800 px-2 py-1.5 text-left">Mata Pelajaran</th>
              <th className="px-2 py-1.5 w-20">Nilai</th>
            </tr>
          </thead>
          <tbody>
            {SEMUA_KOLOM_UJIAN.map((k, idx) => (
              <tr key={k.key} className="border-b border-slate-300 last:border-0">
                <td className="border-r border-slate-800 px-2 py-1 text-center">{idx + 1}</td>
                <td className="border-r border-slate-800 px-2 py-1">{MAPEL_LABEL_IJAZAH[k.key]}</td>
                <td className="px-2 py-1 text-center">
                  {s.nisn ? formatNilai(getTotalNilai(data, s.nisn, k.key)) : "-"}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-800">
              <td colSpan={3} className="px-2 py-1.5">
                Total Nilai : {formatNilai(jumlah)} &nbsp;&nbsp;&nbsp; Rata-Rata : {formatNilai(rataRata)}{" "}
                &nbsp;&nbsp;&nbsp; Peringkat : {rank ?? "-"} dari {totalSiswaKelas}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Tanda tangan Kepala Sekolah (kiri) & Wali Kelas (kanan) --
            kolom kanan digeser lebih jauh ke kanan (bukan 50/50). */}
        <div className="grid grid-cols-[2fr_3fr] gap-6 text-sm mt-6">
          <div>
            <p>Mengetahui</p>
            <p>Kepala Sekolah,</p>
            <div className="h-14" />
            <p className="underline">{profil?.nama_kepala_sekolah || "________________"}</p>
            {profil?.nip_kepala_sekolah && <p>NIP. {profil.nip_kepala_sekolah}</p>}
          </div>
          <div className="pl-24">
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

  const dataToPrint = data.siswaList.find((s) => s.id === selectedSiswaId) ?? null;

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto print:p-0 print:max-w-none">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 print:hidden">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Cetak Nilai Ijazah</h1>
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
            disabled={data.siswaList.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white text-sm font-medium px-3 py-2 hover:bg-indigo-700 disabled:opacity-50"
          >
            <Printer className="h-4 w-4" />
            Cetak Semua Siswa
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-5 print:hidden">
        {fullSelectAccess && (
          <select
            value={selectedRombel}
            onChange={(e) => setSelectedRombel(e.target.value)}
            className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {kelasOptions.map((r) => (
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
          placeholder="2026/2027"
        />

        <select
          value={selectedSiswaId}
          onChange={(e) => setSelectedSiswaId(e.target.value)}
          className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {data.siswaList.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nama}
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
      ) : data.siswaList.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-10 text-center text-slate-400 dark:text-slate-500 print:hidden">
          Tidak ada siswa aktif di kelas ini.
        </div>
      ) : printMode === "all" ? (
        data.siswaList.map((s) => <IjazahCard key={s.id} s={s} />)
      ) : (
        dataToPrint && <IjazahCard s={dataToPrint} />
      )}
    </div>
  );
}
