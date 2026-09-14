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
  isMapelAgama,
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

export default function RekapStsPage() {
  const { role, waliKelasRombel } = useRole();
  const isFullAccessRole = role === "admin" || role === "kepala_sekolah";

  const [rombelOptions, setRombelOptions] = useState<string[]>([]);
  const [selectedRombel, setSelectedRombel] = useState<string>("");
  const [semester, setSemester] = useState<"Ganjil" | "Genap">(getSemesterSaatIni());
  const [tahunAjaran, setTahunAjaran] = useState(getTahunAjaranSaatIni());

  const [profil, setProfil] = useState<ProfilSekolah | null>(null);
  const [tanggalCetakRapor, setTanggalCetakRapor] = useState<string | null>(null);
  const [waliKelasInfo, setWaliKelasInfo] = useState<WaliKelasInfo | null>(null);
  const [mapelKolom, setMapelKolom] = useState<MapelRingkas[]>([]);
  const [adaMapelAgama, setAdaMapelAgama] = useState(false);
  const [ringkasanList, setRingkasanList] = useState<RingkasanSiswa[]>([]);

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
      ? await supabase
          .from("pelajaran")
          .select("id, mapel, singkatan")
          .in("id", mapelIds)
          .order("id", { ascending: true })
      : { data: [] as MapelRingkas[] };

    const mapelList: MapelRingkas[] = pelajaranData ?? [];
    const siswaList: SiswaRingkasNilai[] = siswaRes.data ?? [];

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

    setMapelKolom(mapelList.filter((m) => !isMapelAgama(m.mapel)));
    setAdaMapelAgama(mapelList.some((m) => isMapelAgama(m.mapel)));

    const summaries = hitungRingkasanSiswa(siswaList, mapelList, nilaiRows);
    setRingkasanList(hitungPeringkat(summaries));

    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRombel, tahunAjaran, semester]);

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

  // Tanggal cetak diambil dari panitia_pts_pas.tanggal_cetak_rapor (jenis
  // PTS) untuk tahun ajaran & semester yang dipilih -- jatuh ke tanggal
  // hari ini kalau panitia belum menentukannya.
  const tanggalCetak = tanggalCetakRapor ? new Date(`${tanggalCetakRapor}T00:00:00`) : new Date();

  // Kolom nilai yang ditampilkan: Agama (kalau ada mapel Agama diajarkan di
  // kelas ini) diikuti mapel non-Agama lainnya -- label pakai singkatan
  // (pelajaran.singkatan) supaya kolom tidak terlalu lebar, kecuali Agama.
  const kolomNilai: { key: string; label: string }[] = [
    ...(adaMapelAgama ? [{ key: "Agama", label: "Agama" }] : []),
    ...mapelKolom.map((m) => ({ key: m.mapel, label: m.singkatan || m.mapel })),
  ];

  function nilaiUntuk(data: RingkasanSiswa, key: string): number | null {
    return data.baris.find((b) => b.mapel === key)?.nilai ?? null;
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto print:p-0 print:max-w-none">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 print:hidden">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Rekap STS</h1>
        <button
          onClick={handlePrint}
          disabled={ringkasanList.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white text-sm font-medium px-3 py-2 hover:bg-indigo-700 disabled:opacity-50"
        >
          <Printer className="h-4 w-4" />
          Cetak Rekap
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

          <p className="text-center font-semibold mb-4">
            REKAP NILAI RAPORT
            <br />
            SUMATIF TENGAH SEMESTER
          </p>

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

          {/* Tabel rekap */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-slate-800">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="border-r border-slate-800 px-2 py-1.5 w-10">No</th>
                  <th className="border-r border-slate-800 px-2 py-1.5 text-left min-w-[180px]">Nama Siswa</th>
                  {kolomNilai.map((k) => (
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
                  <th className="border-r border-slate-800 px-2 py-1.5 w-20">Total Nilai</th>
                  <th className="border-r border-slate-800 px-2 py-1.5 w-20">Rata - rata</th>
                  <th className="px-2 py-1.5 w-20">Peringkat</th>
                </tr>
              </thead>
              <tbody>
                {ringkasanList.map((r, idx) => (
                  <tr key={r.siswa.id} className="border-b border-slate-300 last:border-0">
                    <td className="border-r border-slate-800 px-2 py-0.5 leading-tight text-center">{idx + 1}</td>
                    <td className="border-r border-slate-800 px-2 py-0.5 leading-tight">{r.siswa.nama}</td>
                    {kolomNilai.map((k) => (
                      <td key={k.key} className="border-r border-slate-800 px-1 py-0.5 leading-tight text-center">
                        {nilaiUntuk(r, k.key) ?? ""}
                      </td>
                    ))}
                    <td className="border-r border-slate-800 px-2 py-0.5 leading-tight text-center">{r.total ?? 0}</td>
                    <td className="border-r border-slate-800 px-2 py-0.5 leading-tight text-center">{r.rataRata ?? 0}</td>
                    <td className="px-2 py-0.5 leading-tight text-center">{r.peringkat ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Tanda tangan wali kelas -- rata kiri, sejajar kolom Nama Siswa.
              Pakai tabel dengan sel kosong selebar kolom No (w-10 + border)
              supaya sejajar PERSIS dengan tabel rekap di atas. */}
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
