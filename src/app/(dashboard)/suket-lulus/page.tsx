"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useRole } from "@/lib/role-context";
import { compareKelas } from "@/lib/rekap-siswa";
import { formatTanggalIndonesia, isValidNip } from "@/lib/rapor-sts";
import { getTahunAjaranSaatIni } from "@/types/nilai";
import { SEMUA_KOLOM_UJIAN, KolomUjianKey } from "@/types/nilai-ujian-sekolah";
import {
  fetchNilaiRekapData,
  formatNilai,
  getTotalNilai,
  hitungJumlahRataRata,
  NilaiRekapData,
} from "@/lib/nilai-rekap";
import { formatNomorUnikSkl } from "@/lib/nomor-unik-skl";
import { ProfilSekolah } from "@/types/sekolah";
import { Loader2, Printer } from "lucide-react";

const EMPTY_DATA: NilaiRekapData = { siswaList: [], bobotRapor: null, rataRataMap: {}, ujianSklMap: {} };

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

// Ejaan lama dipakai di surat resmi sekolah ini (lih. juga BULAN_GANJIL di
// types/hari-efektif.ts) -- "Nopember", bukan "November".
const BULAN_INDONESIA = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "Nopember", "Desember",
];

function formatTanggalLahir(tgl: string | null): string {
  if (!tgl) return "-";
  const d = new Date(`${tgl}T00:00:00`);
  return `${d.getDate()} ${BULAN_INDONESIA[d.getMonth()]} ${d.getFullYear()}`;
}

type Biodata = {
  tempat_lahir: string | null;
  tanggal_lahir: string | null;
  nama_ayah: string | null;
  nama_ibu: string | null;
  nama_wali: string | null;
};

export default function SuketLulusPage() {
  const { role, waliKelasRombel, moduleAccess } = useRole();
  const isFullAccessRole = role === "admin" || role === "kepala_sekolah";
  const hasModuleEdit = moduleAccess.some((a) => a.module === "suket_lulus" && a.can_edit);
  const fullSelectAccess = isFullAccessRole || hasModuleEdit;

  const [selectedRombel, setSelectedRombel] = useState("");
  const [kelasOptions, setKelasOptions] = useState<string[]>([]);
  const [tahunAjaran, setTahunAjaran] = useState(getTahunAjaranSaatIni());
  const [selectedSiswaId, setSelectedSiswaId] = useState("");
  const [printMode, setPrintMode] = useState<"single" | "all">("single");

  const [profil, setProfil] = useState<ProfilSekolah | null>(null);
  const [kodeKlasifikasi, setKodeKlasifikasi] = useState("400.3.11");
  const [kodeSekolah, setKodeSekolah] = useState("SMPN.14");
  const [tanggalCetakSkl, setTanggalCetakSkl] = useState<string | null>(null);
  const [data, setData] = useState<NilaiRekapData>(EMPTY_DATA);
  const [biodataMap, setBiodataMap] = useState<Record<string, Biodata>>({});
  const [nomorMap, setNomorMap] = useState<Record<string, number>>({});

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

    const [profilRes, pengaturanRes, rekapRes] = await Promise.all([
      supabase.from("profil_sekolah").select("*").eq("id", 1).maybeSingle(),
      supabase
        .from("pengaturan_skl")
        .select("kode_klasifikasi_skl, kode_sekolah_skl, tanggal_cetak_skl")
        .eq("id", 1)
        .maybeSingle(),
      fetchNilaiRekapData(supabase, { tahunAjaran, kelasFilter: selectedRombel }),
    ]);

    setProfil(profilRes.data ?? null);
    if (pengaturanRes.data?.kode_klasifikasi_skl) setKodeKlasifikasi(pengaturanRes.data.kode_klasifikasi_skl);
    if (pengaturanRes.data?.kode_sekolah_skl) setKodeSekolah(pengaturanRes.data.kode_sekolah_skl);
    setTanggalCetakSkl(pengaturanRes.data?.tanggal_cetak_skl ?? null);
    setData(rekapRes.data);
    setError(rekapRes.error);

    const idList = rekapRes.data.siswaList.map((s) => s.id);
    const nisnList = rekapRes.data.siswaList.filter((s) => s.nisn).map((s) => s.nisn as string);

    const [biodataRes, nomorRes] = await Promise.all([
      idList.length > 0
        ? supabase
            .from("siswa01")
            .select("id, tempat_lahir, tanggal_lahir, nama_ayah, nama_ibu, nama_wali")
            .in("id", idList)
        : Promise.resolve({ data: [] as (Biodata & { id: string })[], error: null }),
      nisnList.length > 0
        ? supabase.from("nomor_unik_skl").select("nisn, nomor_unik").in("nisn", nisnList).eq("tahun_ajaran", tahunAjaran)
        : Promise.resolve({ data: [] as { nisn: string; nomor_unik: number }[], error: null }),
    ]);

    const bMap: Record<string, Biodata> = {};
    for (const row of biodataRes.data ?? []) {
      bMap[row.id] = {
        tempat_lahir: row.tempat_lahir,
        tanggal_lahir: row.tanggal_lahir,
        nama_ayah: row.nama_ayah,
        nama_ibu: row.nama_ibu,
        nama_wali: row.nama_wali,
      };
    }
    setBiodataMap(bMap);

    const nMap: Record<string, number> = {};
    for (const row of nomorRes.data ?? []) nMap[row.nisn] = row.nomor_unik;
    setNomorMap(nMap);

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

  const tanggalCetak = tanggalCetakSkl ? new Date(`${tanggalCetakSkl}T00:00:00`) : new Date();

  function SuketCard({ s }: { s: NilaiRekapData["siswaList"][number] }) {
    const { rataRata } = s.nisn ? hitungJumlahRataRata(data, s.nisn) : { rataRata: null };
    const bio = biodataMap[s.id];
    const namaOrangTua = bio?.nama_ayah || bio?.nama_wali || bio?.nama_ibu || "-";
    const nomorUnik = s.nisn ? nomorMap[s.nisn] : undefined;

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

        <div className="text-center mb-4">
          <p className="font-semibold">SURAT KETERANGAN LULUS</p>
          <p>
            Nomor: {nomorUnik !== undefined ? formatNomorUnikSkl(kodeKlasifikasi, nomorUnik, kodeSekolah, tahunAjaran) : "-"}
          </p>
        </div>

        <div className="text-center mb-4">
          <p className="font-semibold">SEKOLAH MENENGAH PERTAMA</p>
          <p>TAHUN AJARAN {tahunAjaran}</p>
        </div>

        <p className="text-sm mb-4">
          Yang bertanda tangan dibawah ini Kepala {profil?.nama_sekolah}, Kecamatan {profil?.kecamatan}, Kota{" "}
          {profil?.kota_kabupaten} menerangkan bahwa :
        </p>

        <table className="w-fit text-sm mb-4 ml-8">
          <tbody>
            <tr>
              <td className="py-0.5 pr-3 whitespace-nowrap align-top">Nama</td>
              <td className="py-0.5 pr-2 align-top">:</td>
              <td className="py-0.5">{s.nama}</td>
            </tr>
            <tr>
              <td className="py-0.5 pr-3 whitespace-nowrap align-top">Tempat, Tanggal Lahir</td>
              <td className="py-0.5 pr-2 align-top">:</td>
              <td className="py-0.5">
                {bio?.tempat_lahir || "-"}, {formatTanggalLahir(bio?.tanggal_lahir ?? null)}
              </td>
            </tr>
            <tr>
              <td className="py-0.5 pr-3 whitespace-nowrap align-top">Nama Orang Tua / Wali</td>
              <td className="py-0.5 pr-2 align-top">:</td>
              <td className="py-0.5">{namaOrangTua}</td>
            </tr>
            <tr>
              <td className="py-0.5 pr-3 whitespace-nowrap align-top">Nomor Induk Siswa</td>
              <td className="py-0.5 pr-2 align-top">:</td>
              <td className="py-0.5">{s.nipd || "-"}</td>
            </tr>
            <tr>
              <td className="py-0.5 pr-3 whitespace-nowrap align-top">Nomor Induk Siswa Nasional</td>
              <td className="py-0.5 pr-2 align-top">:</td>
              <td className="py-0.5">{s.nisn || "-"}</td>
            </tr>
            <tr>
              <td className="py-0.5 pr-3 whitespace-nowrap align-top">Sekolah Asal</td>
              <td className="py-0.5 pr-2 align-top">:</td>
              <td className="py-0.5">{profil?.nama_sekolah}</td>
            </tr>
          </tbody>
        </table>

        <p className="text-sm mb-4">
          telah dinyatakan lulus sesuai dengan ketentuan perundang-undangan yang berlaku dengan nilai sebagai
          berikut :
        </p>

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
            <tr className="border-t-2 border-slate-800 font-semibold">
              <td colSpan={2} className="border-r border-slate-800 px-2 py-1">
                Rata - rata
              </td>
              <td className="px-2 py-1 text-center">{formatNilai(rataRata)}</td>
            </tr>
          </tbody>
        </table>

        <p className="text-sm mb-6">
          Demikian surat keterangan ini dibuat untuk keperluan SPMB SMA, dan berlaku sampai diterbitkanya ijazah
          SMP tahun pelajaran {tahunAjaran}.
        </p>

        <div className="flex justify-end">
          <div className="text-sm text-center mr-[100px]">
            <p>
              {profil?.kota_kabupaten || "Tarakan"}, {formatTanggalIndonesia(tanggalCetak)}
            </p>
            <p>Kepala Sekolah,</p>
            <div className="h-14" />
            <p className="underline">{profil?.nama_kepala_sekolah || "________________"}</p>
            {profil?.nip_kepala_sekolah && isValidNip(profil.nip_kepala_sekolah) && (
              <p>NIP. {profil.nip_kepala_sekolah}</p>
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
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Suket Lulus</h1>
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
        data.siswaList.map((s) => <SuketCard key={s.id} s={s} />)
      ) : (
        dataToPrint && <SuketCard s={dataToPrint} />
      )}
    </div>
  );
}
