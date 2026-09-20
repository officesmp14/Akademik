"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useRole } from "@/lib/role-context";
import { compareKelas } from "@/lib/rekap-siswa";
import { getTahunAjaranSaatIni } from "@/types/nilai";
import { formatNomorUnikSkl } from "@/lib/nomor-unik-skl";
import { ProfilSekolah } from "@/types/sekolah";
import { Loader2, Printer } from "lucide-react";

// Amplop ukuran "Size 10" (standar Ms. Word Envelopes): 4.125 x 9.5 inci.
const AMPLOP_WIDTH_MM = "241.3mm";
const AMPLOP_HEIGHT_MM = "104.8mm";

type Siswa = { id: string; nama: string | null; nisn: string | null; nipd: string | null; rombel: string | null };

export default function CetakAmplopPage() {
  const { role, waliKelasRombel, moduleAccess } = useRole();
  const isFullAccessRole = role === "admin" || role === "kepala_sekolah";
  const hasModuleEdit = moduleAccess.some((a) => a.module === "cetak_amplop" && a.can_edit);
  const fullSelectAccess = isFullAccessRole || hasModuleEdit;

  const [selectedRombel, setSelectedRombel] = useState("");
  const [kelasOptions, setKelasOptions] = useState<string[]>([]);
  const [tahunAjaran, setTahunAjaran] = useState(getTahunAjaranSaatIni());
  const [selectedSiswaId, setSelectedSiswaId] = useState("");
  const [printMode, setPrintMode] = useState<"single" | "all">("single");

  const [profil, setProfil] = useState<ProfilSekolah | null>(null);
  const [kodeKlasifikasi, setKodeKlasifikasi] = useState("400.3.11");
  const [kodeSekolah, setKodeSekolah] = useState("SMPN.14");
  const [siswaList, setSiswaList] = useState<Siswa[]>([]);
  const [nomorMap, setNomorMap] = useState<Record<string, number>>({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Suntik ukuran halaman cetak khusus amplop (bukan A4) selama halaman ini
  // aktif -- dihapus lagi saat pindah halaman supaya tidak memengaruhi
  // halaman cetak lain yang formatnya A4.
  useEffect(() => {
    const style = document.createElement("style");
    style.id = "cetak-amplop-page-size";
    style.textContent = `@page { size: ${AMPLOP_WIDTH_MM} ${AMPLOP_HEIGHT_MM}; margin: 0; }`;
    document.head.appendChild(style);
    return () => {
      document.getElementById("cetak-amplop-page-size")?.remove();
    };
  }, []);

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

    const siswaQuery = supabase
      .from("siswa01")
      .select("id, nama, nisn, nipd, rombel")
      .like("rombel", "IX.%")
      .eq("status_siswa", "Aktif")
      .eq("rombel", selectedRombel)
      .order("nama", { ascending: true });

    const [profilRes, pengaturanRes, siswaRes] = await Promise.all([
      supabase.from("profil_sekolah").select("*").eq("id", 1).maybeSingle(),
      supabase.from("pengaturan_skl").select("kode_klasifikasi_skl, kode_sekolah_skl").eq("id", 1).maybeSingle(),
      siswaQuery,
    ]);

    setProfil(profilRes.data ?? null);
    if (pengaturanRes.data?.kode_klasifikasi_skl) setKodeKlasifikasi(pengaturanRes.data.kode_klasifikasi_skl);
    if (pengaturanRes.data?.kode_sekolah_skl) setKodeSekolah(pengaturanRes.data.kode_sekolah_skl);

    if (siswaRes.error) {
      setError(siswaRes.error.message);
      setLoading(false);
      return;
    }

    const siswaRows = (siswaRes.data ?? []) as Siswa[];
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

    setSelectedSiswaId((prev) => {
      if (siswaRows.some((s) => s.id === prev)) return prev;
      return siswaRows[0]?.id ?? "";
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

  function AmplopCard({ s }: { s: Siswa }) {
    const nomorUnik = s.nisn ? nomorMap[s.nisn] : undefined;
    const nomorSurat =
      nomorUnik !== undefined ? formatNomorUnikSkl(kodeKlasifikasi, nomorUnik, kodeSekolah, tahunAjaran) : "-";

    return (
      <div
        className="relative bg-white text-slate-900 mx-auto mb-8 border border-dashed border-slate-300 print:border-0 print:mb-0 print:break-after-page overflow-hidden box-border"
        style={{
          width: AMPLOP_WIDTH_MM,
          height: AMPLOP_HEIGHT_MM,
          paddingTop: "calc(8mm + 35pt)",
          paddingLeft: "8mm",
          paddingRight: "8mm",
          paddingBottom: "8mm",
        }}
      >
        {/* Kop surat -- versi ringkas supaya muat di tinggi amplop */}
        <div className="flex items-center gap-2 pb-0.5 border-b-2 border-slate-800 mb-1">
          <div className="h-[18mm] w-[18mm] relative shrink-0 ml-[10pt]">
            {profil?.logo_dinas_url && (
              <Image src={profil.logo_dinas_url} alt="Logo Dinas" fill className="object-contain" />
            )}
          </div>
          <div className="flex-1 text-center leading-[1.5]">
            <p className="text-[14px]">{profil?.header_baris1}</p>
            <p className="text-[14px]">{profil?.header_baris2}</p>
            <p className="text-[14px] font-bold">{profil?.nama_sekolah}</p>
            <p className="text-[14px]">{profil?.alamat}</p>
            <p className="text-[14px]">
              Website : {profil?.website} email: {profil?.email}
            </p>
          </div>
          <div className="h-[18mm] w-[18mm] relative shrink-0">
            {profil?.logo_sekolah_url && (
              <Image src={profil.logo_sekolah_url} alt="Logo Sekolah" fill className="object-contain" />
            )}
          </div>
        </div>

        {/* Nomor / Hal */}
        <table className="text-[12px] leading-[1.5] mb-1 ml-[10pt]">
          <tbody>
            <tr>
              <td className="pr-2 whitespace-nowrap align-top">Nomor</td>
              <td className="pr-1 align-top">:</td>
              <td className="align-top">{nomorSurat}</td>
            </tr>
            <tr>
              <td className="pr-2 whitespace-nowrap align-top">Hal.</td>
              <td className="pr-1 align-top">:</td>
              <td className="align-top">Pengumuman Kelulusan</td>
            </tr>
          </tbody>
        </table>

        {/* Kotak Kepada */}
        <div className="flex justify-end">
          <div className="border-2 border-slate-800 rounded-lg px-4 py-1 text-[12px] leading-[1.5] w-[75mm]">
            <p className="underline italic font-semibold mb-0.5">Kepada</p>
            <p>Nama : <span className="font-bold">{s.nama}</span></p>
            <p>
              NIS / NISN &nbsp;: {s.nipd || "-"}/{s.nisn || "-"}
            </p>
            <p>{profil?.nama_sekolah}</p>
            <p>di {profil?.kota_kabupaten || "Tarakan"}</p>
          </div>
        </div>
      </div>
    );
  }

  const dataToPrint = siswaList.find((s) => s.id === selectedSiswaId) ?? null;

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto print:p-0 print:max-w-none">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 print:hidden">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Cetak Amplop</h1>
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
            disabled={siswaList.length === 0}
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
          {siswaList.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nama}
            </option>
          ))}
        </select>
      </div>

      <p className="text-xs text-slate-400 dark:text-slate-500 mb-4 print:hidden">
        Amplop ukuran Size 10 (241.3mm x 104.8mm) -- di dialog cetak browser, pilih ukuran kertas &quot;Size
        10&quot; atau atur kertas kustom ke ukuran tersebut.
      </p>

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
      ) : printMode === "all" ? (
        siswaList.map((s) => <AmplopCard key={s.id} s={s} />)
      ) : (
        dataToPrint && <AmplopCard s={dataToPrint} />
      )}
    </div>
  );
}
