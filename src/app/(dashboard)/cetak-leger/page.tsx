"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useRole } from "@/lib/role-context";
import { compareKelas } from "@/lib/rekap-siswa";
import { getFase, formatTanggalIndonesia, isValidNip, fetchWaliKelasInfo, WaliKelasInfo } from "@/lib/rapor-sts";
import { getTahunAjaranSaatIni, getSemesterSaatIni } from "@/types/nilai";
import { SEMUA_KOLOM_UJIAN } from "@/types/nilai-ujian-sekolah";
import {
  fetchNilaiRekapData,
  formatNilai,
  getTotalNilai,
  hitungJumlahRataRata,
  hitungRank,
  NilaiRekapData,
} from "@/lib/nilai-rekap";
import { ProfilSekolah } from "@/types/sekolah";
import { Loader2, Printer } from "lucide-react";

const EMPTY_DATA: NilaiRekapData = { siswaList: [], bobotRapor: null, rataRataMap: {}, ujianSklMap: {} };

export default function CetakLegerPage() {
  const { role, waliKelasRombel, moduleAccess } = useRole();
  const isFullAccessRole = role === "admin" || role === "kepala_sekolah";
  const hasModuleEdit = moduleAccess.some((a) => a.module === "cetak_leger" && a.can_edit);
  const fullSelectAccess = isFullAccessRole || hasModuleEdit;

  const [selectedRombel, setSelectedRombel] = useState("");
  const [kelasOptions, setKelasOptions] = useState<string[]>([]);
  const [tahunAjaran, setTahunAjaran] = useState(getTahunAjaranSaatIni());
  const [semester, setSemester] = useState<"Ganjil" | "Genap">(getSemesterSaatIni());

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
  }, [selectedRombel, tahunAjaran]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function handlePrint() {
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

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto print:p-0 print:max-w-none">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 print:hidden">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Cetak Leger</h1>
        <button
          onClick={handlePrint}
          disabled={data.siswaList.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white text-sm font-medium px-3 py-2 hover:bg-indigo-700 disabled:opacity-50"
        >
          <Printer className="h-4 w-4" />
          Cetak
        </button>
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
      ) : (
        <div className="bg-white text-slate-900 border border-slate-200 rounded-xl p-8 print:border-0 print:rounded-none print:p-0">
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

          <p className="text-center font-semibold mb-4">REKAP NILAI IJAZAH</p>

          {/* Info kelas & periode */}
          <div className="grid grid-cols-2 text-sm mb-4">
            <table className="w-fit">
              <tbody>
                <tr>
                  <td className="py-0.5 pr-3 whitespace-nowrap">Kelas</td>
                  <td className="py-0.5">: {selectedRombel}</td>
                </tr>
                <tr>
                  <td className="py-0.5 pr-3 whitespace-nowrap">Fase</td>
                  <td className="py-0.5">: {getFase(selectedRombel)}</td>
                </tr>
              </tbody>
            </table>
            <table className="w-fit justify-self-end">
              <tbody>
                <tr>
                  <td className="py-0.5 pr-3 whitespace-nowrap">Tahun Ajaran</td>
                  <td className="py-0.5">: {tahunAjaran.replace("/", " / ")}</td>
                </tr>
                <tr>
                  <td className="py-0.5 pr-3 whitespace-nowrap">Semester</td>
                  <td className="py-0.5">: {semester.toUpperCase()}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Tabel leger */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-slate-800">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="border-r border-slate-800 px-2 py-1.5 w-10">No</th>
                  <th className="border-r border-slate-800 px-2 py-1.5 text-left min-w-[180px]">Nama Siswa</th>
                  {SEMUA_KOLOM_UJIAN.map((k) => (
                    <th
                      key={k.key}
                      className="border-r border-slate-800 px-1 py-1.5 w-8 align-bottom"
                      title={k.label}
                    >
                      <span className="inline-block [writing-mode:vertical-rl] rotate-180 whitespace-nowrap">
                        {k.label}
                      </span>
                    </th>
                  ))}
                  <th className="border-r border-slate-800 px-2 py-1.5 w-20">Jumlah</th>
                  <th className="border-r border-slate-800 px-2 py-1.5 w-20">Rata-Rata</th>
                  <th className="px-2 py-1.5 w-20">Peringkat</th>
                </tr>
              </thead>
              <tbody>
                {data.siswaList.map((s, idx) => {
                  const { jumlah, rataRata } = s.nisn
                    ? hitungJumlahRataRata(data, s.nisn)
                    : { jumlah: null, rataRata: null };
                  const rank = s.nisn ? rankMap.get(s.nisn) ?? null : null;
                  return (
                    <tr key={s.id} className="border-b border-slate-300 last:border-0">
                      <td className="border-r border-slate-800 px-2 py-0.5 leading-tight text-center">{idx + 1}</td>
                      <td className="border-r border-slate-800 px-2 py-0.5 leading-tight">{s.nama}</td>
                      {SEMUA_KOLOM_UJIAN.map((k) => (
                        <td
                          key={k.key}
                          className="border-r border-slate-800 px-1 py-0.5 leading-tight text-center"
                        >
                          {s.nisn ? formatNilai(getTotalNilai(data, s.nisn, k.key)) : "-"}
                        </td>
                      ))}
                      <td className="border-r border-slate-800 px-2 py-0.5 leading-tight text-center">
                        {formatNilai(jumlah)}
                      </td>
                      <td className="border-r border-slate-800 px-2 py-0.5 leading-tight text-center">
                        {formatNilai(rataRata)}
                      </td>
                      <td className="px-2 py-0.5 leading-tight text-center">{rank ?? "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

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
      )}
    </div>
  );
}
