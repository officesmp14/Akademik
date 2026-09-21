"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useRole } from "@/lib/role-context";
import { compareKelas } from "@/lib/rekap-siswa";
import { getFase, formatTanggalIndonesia, isValidNip, fetchWaliKelasInfo, WaliKelasInfo } from "@/lib/rapor-sts";
import { getTahunAjaranSaatIni } from "@/types/nilai";
import { ProfilSekolah } from "@/types/sekolah";
import { Loader2, Printer } from "lucide-react";

type SiswaRingkas = { id: string; nama: string | null };

export default function TandaTerimaSklPage() {
  const { role, waliKelasRombel } = useRole();
  const isFullAccessRole = role === "admin" || role === "kepala_sekolah";

  const [rombelOptions, setRombelOptions] = useState<string[]>([]);
  const [selectedRombel, setSelectedRombel] = useState<string>("");
  const [tahunAjaran, setTahunAjaran] = useState(getTahunAjaranSaatIni());

  const [profil, setProfil] = useState<ProfilSekolah | null>(null);
  const [tanggalCetakSkl, setTanggalCetakSkl] = useState<string | null>(null);
  const [waliKelasInfo, setWaliKelasInfo] = useState<WaliKelasInfo | null>(null);
  const [siswaList, setSiswaList] = useState<SiswaRingkas[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tentukan rombel: wali kelas IX -> otomatis kelasnya sendiri; admin/kepsek -> pilih (Kelas IX saja)
  useEffect(() => {
    async function initRombel() {
      const supabase = createClient();
      if (waliKelasRombel?.startsWith("IX.")) {
        setSelectedRombel(waliKelasRombel);
      } else if (isFullAccessRole) {
        const { data } = await supabase
          .from("siswa01")
          .select("rombel")
          .like("rombel", "IX.%")
          .not("rombel", "is", null);
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

    const [profilRes, waliKelasInfoResult, siswaRes, pengaturanRes] = await Promise.all([
      supabase.from("profil_sekolah").select("*").eq("id", 1).maybeSingle(),
      fetchWaliKelasInfo(supabase, selectedRombel),
      supabase
        .from("siswa01")
        .select("id, nama")
        .eq("rombel", selectedRombel)
        .eq("status_siswa", "Aktif")
        .order("nama", { ascending: true }),
      supabase.from("pengaturan_skl").select("tanggal_cetak_skl").eq("id", 1).maybeSingle(),
    ]);

    if (siswaRes.error) {
      setError(siswaRes.error.message);
      setLoading(false);
      return;
    }

    setProfil(profilRes.data ?? null);
    setTanggalCetakSkl(pengaturanRes.data?.tanggal_cetak_skl ?? null);
    setWaliKelasInfo(waliKelasInfoResult);
    setSiswaList(siswaRes.data ?? []);

    setLoading(false);
  }, [selectedRombel]);

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

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto print:p-0 print:max-w-none">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 print:hidden">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Tanda Terima SKL</h1>
        <button
          onClick={handlePrint}
          disabled={siswaList.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white text-sm font-medium px-3 py-2 hover:bg-indigo-700 disabled:opacity-50"
        >
          <Printer className="h-4 w-4" />
          Cetak
        </button>
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

        <input
          value={tahunAjaran}
          onChange={(e) => setTahunAjaran(e.target.value)}
          className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm w-32 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
      ) : siswaList.length === 0 ? (
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

          <p className="text-center font-semibold mb-4">TANDA TERIMA SURAT KELULUSAN</p>

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
                  <td className="py-0.5">: Genap</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Tabel tanda terima */}
          <table className="w-full text-sm border border-slate-800">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="border-r border-slate-800 px-2 py-1.5 w-10">No</th>
                <th className="border-r border-slate-800 px-2 py-1.5 text-left">Nama Siswa</th>
                <th className="px-2 py-1.5 w-1/3">Tanda Tangan</th>
              </tr>
            </thead>
            <tbody>
              {siswaList.map((s, idx) => (
                <tr key={s.id} className="border-b border-slate-300 last:border-0">
                  <td className="border-r border-slate-800 px-2 py-0.5 leading-tight text-center">{idx + 1}</td>
                  <td className="border-r border-slate-800 px-2 py-0.5 leading-tight">{s.nama}</td>
                  {/* Nomor ganjil rata kiri, nomor genap rata tengah -- selang-seling. */}
                  <td className={`px-2 py-0.5 leading-tight ${(idx + 1) % 2 === 1 ? "text-left" : "text-center"}`}>
                    {idx + 1}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Tanda tangan wali kelas -- rata kiri, sejajar kolom Nama Siswa.
              Pakai tabel dengan sel kosong selebar kolom No (w-10 + border)
              supaya sejajar PERSIS dengan tabel di atas. */}
          <table className="mt-6 text-sm">
            <tbody>
              <tr>
                <td className="w-10 border-r border-transparent px-2" />
                <td>
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
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
