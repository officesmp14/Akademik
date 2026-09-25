"use client";

import { useCallback, useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/client";
import { useRole } from "@/lib/role-context";
import { getTahunAjaranSaatIni } from "@/types/nilai";
import { formatTanggalIndonesia } from "@/lib/rapor-sts";
import { ProfilSekolah } from "@/types/sekolah";
import {
  MAPEL_KEBUTUHAN_GURU,
  cocokkanMapel,
  bucketStatusKepegawaian,
  AnalisisKebutuhanGuru,
  hitungJumlahGuru,
  hitungJumlahRombel,
  turunanDariPelajaran,
  hitungWakaPerpusLabPerMapel,
  type PelajaranRef,
  hitungJmlJjm,
  hitungTotalJam,
  hitungJamPerGuru,
  hitungKurangLebihGuru,
  hitungKebutuhanPns,
  hitungAbk,
  hitungAbkOtomatis,
  hitungKebutuhanKebersihan,
} from "@/lib/analisis-kebutuhan";
import { ChevronLeft, Loader2, Check, RefreshCw, Printer, Download, Users } from "lucide-react";

type TabKey = "guru" | "administrasi" | "kebersihan-keamanan";

const TABS: { key: TabKey; label: string }[] = [
  { key: "guru", label: "Analisis Kebutuhan Guru" },
  { key: "administrasi", label: "Tenaga Administrasi" },
  { key: "kebersihan-keamanan", label: "Kebersihan & Keamanan" },
];

type TahunProps = { tahunAjaran: string; setTahunAjaran: (v: string) => void };

function useCanEditAnalisisKebutuhan() {
  const { role, moduleAccess } = useRole();
  const isFullAccessRole = role === "admin" || role === "kepala_sekolah";
  const hasModuleEdit = moduleAccess.some((a) => a.module === "analisis_kebutuhan" && a.can_edit);
  return isFullAccessRole || hasModuleEdit;
}

type SupabaseClientLike = ReturnType<typeof createClient>;

// Guru hanya boleh membaca datagtk / gtk_penugasan_mengajar miliknya sendiri
// (RLS), jadi dua query ini pakai VIEW publik (supabase/gtk-view-guru-laporan.sql)
// supaya hitungan kompetensi & Waka/Perpus/Lab benar untuk semua role. Kalau
// view belum dibuat, jatuh balik ke tabel asli (cukup untuk admin/kepsek).
async function ambilGtkGuruAktif(supabase: SupabaseClientLike) {
  const view = await supabase
    .from("gtk_analisis_kebutuhan_publik")
    .select("id, kompetensi")
    .eq("status_aktif", "Y")
    .eq("jenis_ptk", "Guru");
  if (!view.error) return view;
  return supabase.from("datagtk").select("id, kompetensi").eq("status_aktif", "Y").eq("jenis_ptk", "Guru");
}

async function ambilPenugasanTahun(supabase: SupabaseClientLike, tahunAjaran: string) {
  const view = await supabase
    .from("gtk_penugasan_analisis_kebutuhan_publik")
    .select("gtk_id, jam_tugas_tambahan")
    .eq("tahun_ajaran", tahunAjaran);
  if (!view.error) return view;
  return supabase.from("gtk_penugasan_mengajar").select("gtk_id, jam_tugas_tambahan").eq("tahun_ajaran", tahunAjaran);
}

function angka(value: number | null): string {
  if (value === null) return "-";
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function NumberCell({
  value,
  onChange,
  disabled,
  width = "w-16",
  placeholder,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  disabled: boolean;
  width?: string;
  placeholder?: string;
}) {
  return (
    <input
      type="number"
      value={value ?? ""}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      className={`${width} rounded border border-slate-300 dark:border-slate-600 px-1.5 py-1 text-xs text-center bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400`}
    />
  );
}

// =====================================================================
// Tab 1 -- Analisis Kebutuhan Guru
// =====================================================================

function GuruTab({ profil, tahunAjaran, setTahunAjaran }: TahunProps & { profil: ProfilSekolah | null }) {
  const canEdit = useCanEditAnalisisKebutuhan();

  const [rows, setRows] = useState<AnalisisKebutuhanGuru[]>([]);
  const [jumlahMurid, setJumlahMurid] = useState(0);
  const [agamaBreakdown, setAgamaBreakdown] = useState<Record<string, number>>({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [matching, setMatching] = useState(false);
  const [saved, setSaved] = useState(false);
  // Baris yang ditandai (diklik) -- klik lagi untuk melepas tanda
  const [barisDitandai, setBarisDitandai] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const [siswaRes, rowsRes, pelajaranRes, gtkRes, penugasanRes] = await Promise.all([
      supabase.from("siswa01").select("agama").eq("status_siswa", "Aktif"),
      supabase.from("analisis_kebutuhan_guru").select("*").eq("tahun_ajaran", tahunAjaran),
      supabase.from("pelajaran").select("mapel, jjm, jml_rombel7, jml_rombel8, jml_rombel9, jumlah_rombel"),
      ambilGtkGuruAktif(supabase),
      ambilPenugasanTahun(supabase, tahunAjaran),
    ]);

    if (siswaRes.error) {
      setError(siswaRes.error.message);
      setLoading(false);
      return;
    }
    const siswaRows = siswaRes.data ?? [];
    setJumlahMurid(siswaRows.length);
    const breakdown: Record<string, number> = {};
    for (const s of siswaRows) {
      const agama = s.agama || "Lainnya";
      breakdown[agama] = (breakdown[agama] ?? 0) + 1;
    }
    setAgamaBreakdown(breakdown);

    if (rowsRes.error) {
      setError(rowsRes.error.message);
      setLoading(false);
      return;
    }
    if (pelajaranRes.error) {
      setError(pelajaranRes.error.message);
      setLoading(false);
      return;
    }
    if (gtkRes.error || penugasanRes.error) {
      setError((gtkRes.error ?? penugasanRes.error)!.message);
      setLoading(false);
      return;
    }
    const merged = gabungRowsGuru(
      tahunAjaran,
      (rowsRes.data ?? []) as AnalisisKebutuhanGuru[],
      (pelajaranRes.data ?? []) as PelajaranRef[],
      gtkRes.data ?? [],
      penugasanRes.data ?? []
    );
    setRows(merged);
    setLoading(false);
  }, [tahunAjaran]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function toggleTandaBaris(mapel: string) {
    setBarisDitandai((prev) => {
      const next = new Set(prev);
      if (next.has(mapel)) next.delete(mapel);
      else next.add(mapel);
      return next;
    });
  }

  function updateRow(mapel: string, patch: Partial<AnalisisKebutuhanGuru>) {
    setRows((prev) => prev.map((r) => (r.mapel === mapel ? { ...r, ...patch } : r)));
  }

  async function handleIsiOtomatis() {
    const sudahAda = rows.some((r) => r.guru_pns || r.guru_pppk || r.guru_honor);
    if (
      sudahAda &&
      !window.confirm(
        "Beberapa mapel sudah punya jumlah guru. Isi Otomatis akan menimpa jumlah PNS/PPPK/Honor yang sudah ada (belum disimpan). Lanjutkan?"
      )
    ) {
      return;
    }

    setMatching(true);
    setError(null);
    const supabase = createClient();

    const { data: gtkRows, error: gtkErr } = await supabase
      .from("datagtk")
      .select("id, kompetensi, status_kepegawaian")
      .eq("status_aktif", "Y")
      // Hanya Guru -- Kepala Sekolah & Tenaga Kependidikan tidak masuk hitungan kebutuhan guru
      .eq("jenis_ptk", "Guru");
    if (gtkErr) {
      setMatching(false);
      setError(gtkErr.message);
      return;
    }

    const counts: Record<string, { pns: number; pppk: number; honor: number }> = {};
    for (const mapel of MAPEL_KEBUTUHAN_GURU) counts[mapel] = { pns: 0, pppk: 0, honor: 0 };

    // Satu GTK dihitung satu kali, berdasarkan kolom datagtk.kompetensi
    for (const g of gtkRows ?? []) {
      const mapel = cocokkanMapel(g.kompetensi);
      if (!mapel) continue;
      const bucket = bucketStatusKepegawaian(g.status_kepegawaian);
      if (!bucket) continue;
      counts[mapel][bucket] += 1;
    }

    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        guru_pns: counts[r.mapel].pns,
        guru_pppk: counts[r.mapel].pppk,
        guru_honor: counts[r.mapel].honor,
      }))
    );
    setMatching(false);
  }

  async function handleSimpanSemua() {
    setSaving(true);
    setSaved(false);
    setError(null);
    const supabase = createClient();

    const payload = rows.map((r) => {
      const { id: _id, ...rest } = r;
      void _id;
      return {
        ...rest,
        jumlah_guru: hitungJumlahGuru(r),
        jumlah_rombel: hitungJumlahRombel(r),
        jml_jjm: hitungJmlJjm(r),
        total_jam: hitungTotalJam(r),
        kebutuhan_pns: hitungKebutuhanPns(r),
        abk: hitungAbk(r),
        jam_per_guru: hitungJamPerGuru(r),
        kurang_lebih: hitungKurangLebihGuru(r),
        tahun_ajaran: tahunAjaran,
      };
    });

    const { error } = await supabase
      .from("analisis_kebutuhan_guru")
      .upsert(payload, { onConflict: "tahun_ajaran,mapel" });

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    loadData();
  }

  function handlePrint() {
    setTimeout(() => window.print(), 50);
  }

  function handleExport() {
    const data = barisExcelGuru(rows);
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "GURU");
    XLSX.writeFile(wb, `Analisis-Kebutuhan-Guru-${tahunAjaran.replace("/", "-")}.xlsx`);
  }

  const kotaKode = (profil?.kota_kabupaten || "").toUpperCase().split("").join(" ");

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 print:hidden">
        <div className="flex items-center gap-2">
          <input
            value={tahunAjaran}
            onChange={(e) => setTahunAjaran(e.target.value)}
            placeholder="2025/2026"
            className="w-32 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm text-center bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <button
              onClick={handleIsiOtomatis}
              disabled={matching || loading}
              className="inline-flex items-center gap-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
            >
              {matching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Isi Otomatis dari Kompetensi GTK
            </button>
          )}
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            <Download className="h-4 w-4" />
            Excel
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white text-sm font-medium px-3 py-2 hover:bg-indigo-700"
          >
            <Printer className="h-4 w-4" />
            Cetak
          </button>
          {canEdit && (
            <button
              onClick={handleSimpanSemua}
              disabled={saving || loading}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 text-white text-sm font-medium px-3 py-2 hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Simpan
            </button>
          )}
          {saved && <span className="text-sm text-emerald-600 dark:text-emerald-400">Tersimpan.</span>}
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg px-3 py-2 mb-4 print:hidden">
          {error}
        </p>
      )}

      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 print:hidden">
        Jumlah Murid Aktif: <strong>{jumlahMurid}</strong> &middot;{" "}
        {Object.entries(agamaBreakdown)
          .map(([agama, jml]) => `${agama}: ${jml}`)
          .join(" / ")}
      </p>

      {loading ? (
        <div className="flex justify-center py-10 print:hidden">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400 dark:text-slate-500" />
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-x-auto print:hidden">
          <table className="text-xs whitespace-nowrap">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40 text-slate-500 dark:text-slate-400">
                <th className="px-2 py-2" rowSpan={2}>
                  No
                </th>
                <th className="px-2 py-2 text-left" rowSpan={2}>
                  Mata Pelajaran
                </th>
                <th className="px-2 py-2" colSpan={4}>
                  Guru yang Ada
                </th>
                <th className="px-2 py-2" rowSpan={2}>
                  Kebutuhan PNS
                </th>
                <th className="px-2 py-2" rowSpan={2}>
                  ABK
                </th>
                <th className="px-2 py-2" colSpan={4}>
                  Rombel
                </th>
                <th className="px-2 py-2" rowSpan={2}>
                  JJM
                </th>
                <th className="px-2 py-2" rowSpan={2}>
                  Waka/Perpus/Lab
                </th>
                <th className="px-2 py-2" colSpan={3}>
                  Total Jam
                </th>
                <th className="px-2 py-2" rowSpan={2}>
                  Kurang/Lebih
                </th>
              </tr>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40 text-slate-500 dark:text-slate-400">
                <th className="px-2 py-1.5">PNS</th>
                <th className="px-2 py-1.5">PPPK</th>
                <th className="px-2 py-1.5">Honor</th>
                <th className="px-2 py-1.5">Jumlah</th>
                <th className="px-2 py-1.5">VII</th>
                <th className="px-2 py-1.5">VIII</th>
                <th className="px-2 py-1.5">IX</th>
                <th className="px-2 py-1.5">Jumlah</th>
                <th className="px-2 py-1.5">Jml JJM</th>
                <th className="px-2 py-1.5">Total Jam</th>
                <th className="px-2 py-1.5">Jam/Guru</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => {
                return (
                  <tr
                    key={r.mapel}
                    onClick={(e) => {
                      // Klik di kolom isian tidak ikut menandai baris
                      if ((e.target as HTMLElement).closest("input, button, select, textarea")) return;
                      toggleTandaBaris(r.mapel);
                    }}
                    className={`border-b border-slate-100 dark:border-slate-700/60 last:border-0 cursor-pointer ${
                      barisDitandai.has(r.mapel) ? "bg-amber-100 dark:bg-amber-500/20" : "hover:bg-slate-50 dark:hover:bg-slate-700/40"
                    }`}
                  >
                    <td className="px-2 py-1.5 text-center text-slate-500 dark:text-slate-400">{idx + 1}</td>
                    <td className="px-2 py-1.5 text-slate-800 dark:text-slate-200">{r.mapel}</td>
                    <td className="px-2 py-1.5">
                      <NumberCell
                        value={r.guru_pns}
                        disabled={!canEdit}
                        onChange={(v) => updateRow(r.mapel, { guru_pns: v ?? 0 })}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <NumberCell
                        value={r.guru_pppk}
                        disabled={!canEdit}
                        onChange={(v) => updateRow(r.mapel, { guru_pppk: v ?? 0 })}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <NumberCell
                        value={r.guru_honor}
                        disabled={!canEdit}
                        onChange={(v) => updateRow(r.mapel, { guru_honor: v ?? 0 })}
                      />
                    </td>
                    <td className="px-2 py-1.5 text-center font-medium">{hitungJumlahGuru(r)}</td>
                    <td className="px-2 py-1.5 text-center">{angka(hitungKebutuhanPns(r))}</td>
                    <td className="px-2 py-1.5">
                      {/* Kosong = otomatis (angka abu = hitungan otomatis); isi = manual */}
                      <NumberCell
                        value={r.abk_manual ?? null}
                        placeholder={String(hitungAbkOtomatis(r))}
                        disabled={!canEdit}
                        onChange={(v) => updateRow(r.mapel, { abk_manual: v })}
                        width="w-14"
                      />
                    </td>
                    <td className="px-2 py-1.5 text-center">{r.rombel_7}</td>
                    <td className="px-2 py-1.5 text-center">{r.rombel_8}</td>
                    <td className="px-2 py-1.5 text-center">{r.rombel_9}</td>
                    <td className="px-2 py-1.5 text-center font-medium">{hitungJumlahRombel(r)}</td>
                    <td className="px-2 py-1.5 text-center">{r.jjm ?? "-"}</td>
                    <td className="px-2 py-1.5 text-center">{r.waka_perpus_lab}</td>
                    <td className="px-2 py-1.5 text-center">{hitungJmlJjm(r)}</td>
                    <td className="px-2 py-1.5 text-center">{hitungTotalJam(r)}</td>
                    <td className="px-2 py-1.5 text-center">{angka(hitungJamPerGuru(r))}</td>
                    <td className="px-2 py-1.5 text-center font-semibold">{angka(hitungKurangLebihGuru(r))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Cetak */}
      <div className="hidden print:block text-black">
        <div className="flex items-center gap-4 pb-3 border-b-2 border-slate-800 mb-4">
          <div className="flex-1 text-center">
            <p className="text-sm">{profil?.header_baris1}</p>
            <p className="text-sm">{profil?.header_baris2}</p>
            <p className="text-lg font-bold">{profil?.nama_sekolah}</p>
            <p className="text-xs">{profil?.alamat}</p>
            <p className="text-xs tracking-widest">
              {kotaKode} {profil?.kode_pos}
            </p>
          </div>
        </div>
        <p className="text-center font-semibold mb-4">
          ANALISIS KEBUTUHAN GURU -- TAHUN AJARAN {tahunAjaran}
        </p>
        <table className="w-full text-[9px] border border-black">
          <thead>
            <tr className="border-b border-black">
              <th className="border-r border-black px-1 py-1">No</th>
              <th className="border-r border-black px-1 py-1 text-left">Mata Pelajaran</th>
              <th className="border-r border-black px-1 py-1">PNS</th>
              <th className="border-r border-black px-1 py-1">PPPK</th>
              <th className="border-r border-black px-1 py-1">Honor</th>
              <th className="border-r border-black px-1 py-1">Jumlah</th>
              <th className="border-r border-black px-1 py-1">ABK</th>
              <th className="px-1 py-1">Kurang/Lebih</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={r.mapel} className="border-b border-slate-400 last:border-0">
                <td className="border-r border-black px-1 py-1 text-center">{idx + 1}</td>
                <td className="border-r border-black px-1 py-1">{r.mapel}</td>
                <td className="border-r border-black px-1 py-1 text-center">{r.guru_pns}</td>
                <td className="border-r border-black px-1 py-1 text-center">{r.guru_pppk}</td>
                <td className="border-r border-black px-1 py-1 text-center">{r.guru_honor}</td>
                <td className="border-r border-black px-1 py-1 text-center">{hitungJumlahGuru(r)}</td>
                <td className="border-r border-black px-1 py-1 text-center">{hitungAbk(r)}</td>
                <td className="px-1 py-1 text-center">{angka(hitungKurangLebihGuru(r))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// =====================================================================
// Tab 2 -- Tenaga Administrasi
// =====================================================================

type AnalisisKebutuhanAdministrasi = {
  tahun_ajaran: string;
  penelaah_bazzeting: number | null;
  penelaah_kebutuhan: number | null;
  pengadministrasi_pns: number | null;
  pengadministrasi_pppk: number | null;
  pengadministrasi_honor: number | null;
  pengadministrasi_kebutuhan: number | null;
  pengelola_bazzeting: number | null;
  pengelola_kebutuhan: number | null;
  penata_bazzeting: number | null;
  penata_kebutuhan: number | null;
};

function emptyAdministrasi(tahunAjaran: string): AnalisisKebutuhanAdministrasi {
  return {
    tahun_ajaran: tahunAjaran,
    penelaah_bazzeting: null,
    penelaah_kebutuhan: null,
    pengadministrasi_pns: null,
    pengadministrasi_pppk: null,
    pengadministrasi_honor: null,
    pengadministrasi_kebutuhan: null,
    pengelola_bazzeting: null,
    pengelola_kebutuhan: null,
    penata_bazzeting: null,
    penata_kebutuhan: null,
  };
}

function kurangLebih(existing: number | null, kebutuhan: number | null): number | null {
  if (existing === null && kebutuhan === null) return null;
  return (existing ?? 0) - (kebutuhan ?? 0);
}

function AdministrasiTab({ profil, tahunAjaran, setTahunAjaran }: TahunProps & { profil: ProfilSekolah | null }) {
  const canEdit = useCanEditAnalisisKebutuhan();

  const [fetching, setFetching] = useState(false);
  const [form, setForm] = useState<AnalisisKebutuhanAdministrasi>(emptyAdministrasi(getTahunAjaranSaatIni()));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("analisis_kebutuhan_administrasi")
      .select("*")
      .eq("tahun_ajaran", tahunAjaran)
      .maybeSingle();

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setForm(data ? (data as AnalisisKebutuhanAdministrasi) : emptyAdministrasi(tahunAjaran));
    setLoading(false);
  }, [tahunAjaran]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleAmbilDariGtk() {
    setFetching(true);
    setError(null);
    const supabase = createClient();
    // Hanya GTK aktif; dikelompokkan menurut datagtk.jenis_ptk_pdd
    const { data, error } = await supabase
      .from("datagtk")
      .select("jenis_ptk_pdd, status_kepegawaian")
      .eq("status_aktif", "Y");
    setFetching(false);
    if (error) {
      setError(error.message);
      return;
    }

    const hitung = (jenis: string) => (data ?? []).filter((g) => g.jenis_ptk_pdd === jenis);
    const pengadministrasi = hitung("Pengadministrasi Perkantoran");
    const perStatus = (status: string) => pengadministrasi.filter((g) => bucketStatusKepegawaian(g.status_kepegawaian) === status).length;

    // Pengelola Layanan Operasional tidak ada di referensi Jenis PTK Dinas Pendidikan -> tidak diubah
    setForm((f) => ({
      ...f,
      penelaah_bazzeting: hitung("Penelaah Teknis Kebijakan").length,
      pengadministrasi_pns: perStatus("pns"),
      pengadministrasi_pppk: perStatus("pppk"),
      pengadministrasi_honor: perStatus("honor"),
      penata_bazzeting: hitung("Penata Layanan Operasional").length,
    }));
  }

  async function handleSimpan() {
    setSaving(true);
    setSaved(false);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("analisis_kebutuhan_administrasi")
      .upsert({ ...form, tahun_ajaran: tahunAjaran }, { onConflict: "tahun_ajaran" });
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handlePrint() {
    setTimeout(() => window.print(), 50);
  }

  async function handleExport() {
    const supabase = createClient();
    const { count } = await supabase
      .from("siswa01")
      .select("id", { count: "exact", head: true })
      .eq("status_siswa", "Aktif");
    const jumlahMurid = count ?? 0;
    const ws = buatSheetAdministrasi(form, profil?.nama_sekolah ?? "", jumlahMurid);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "TENAGA ADMINISTRASI");
    XLSX.writeFile(wb, `Analisis-Kebutuhan-Administrasi-${tahunAjaran.replace("/", "-")}.xlsx`);
  }

  const pengadministrasiJumlah =
    (form.pengadministrasi_pns ?? 0) + (form.pengadministrasi_pppk ?? 0) + (form.pengadministrasi_honor ?? 0);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 print:hidden">
        <input
          value={tahunAjaran}
          onChange={(e) => setTahunAjaran(e.target.value)}
          placeholder="2025/2026"
          className="w-32 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm text-center bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <div className="flex items-center gap-2">
          {canEdit && (
            <button
              onClick={handleAmbilDariGtk}
              disabled={fetching || loading}
              className="inline-flex items-center gap-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
            >
              {fetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
              Ambil dari data GTK
            </button>
          )}
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            <Download className="h-4 w-4" />
            Excel
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white text-sm font-medium px-3 py-2 hover:bg-indigo-700"
          >
            <Printer className="h-4 w-4" />
            Cetak
          </button>
          {canEdit && (
            <button
              onClick={handleSimpan}
              disabled={saving || loading}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 text-white text-sm font-medium px-3 py-2 hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Simpan
            </button>
          )}
          {saved && <span className="text-sm text-emerald-600 dark:text-emerald-400">Tersimpan.</span>}
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg px-3 py-2 mb-4 print:hidden">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-10 print:hidden">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400 dark:text-slate-500" />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4 print:hidden">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">
              Penelaah Teknis Kebijakan
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm text-slate-600 dark:text-slate-300">Bazzeting</label>
                <NumberCell
                  value={form.penelaah_bazzeting}
                  disabled={!canEdit}
                  onChange={(v) => setForm((f) => ({ ...f, penelaah_bazzeting: v }))}
                  width="w-24"
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm text-slate-600 dark:text-slate-300">Kebutuhan</label>
                <NumberCell
                  value={form.penelaah_kebutuhan}
                  disabled={!canEdit}
                  onChange={(v) => setForm((f) => ({ ...f, penelaah_kebutuhan: v }))}
                  width="w-24"
                />
              </div>
              <p className="text-xs pt-2 border-t border-slate-100 dark:border-slate-700/60 text-slate-500 dark:text-slate-400">
                Kurang/Lebih:{" "}
                <strong className="text-slate-800 dark:text-slate-200">
                  {angka(kurangLebih(form.penelaah_bazzeting, form.penelaah_kebutuhan))}
                </strong>
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">
              Pengadministrasi Perkantoran
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm text-slate-600 dark:text-slate-300">PNS</label>
                <NumberCell
                  value={form.pengadministrasi_pns}
                  disabled={!canEdit}
                  onChange={(v) => setForm((f) => ({ ...f, pengadministrasi_pns: v }))}
                  width="w-24"
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm text-slate-600 dark:text-slate-300">PPPK</label>
                <NumberCell
                  value={form.pengadministrasi_pppk}
                  disabled={!canEdit}
                  onChange={(v) => setForm((f) => ({ ...f, pengadministrasi_pppk: v }))}
                  width="w-24"
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm text-slate-600 dark:text-slate-300">Honor</label>
                <NumberCell
                  value={form.pengadministrasi_honor}
                  disabled={!canEdit}
                  onChange={(v) => setForm((f) => ({ ...f, pengadministrasi_honor: v }))}
                  width="w-24"
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm text-slate-600 dark:text-slate-300">Kebutuhan</label>
                <NumberCell
                  value={form.pengadministrasi_kebutuhan}
                  disabled={!canEdit}
                  onChange={(v) => setForm((f) => ({ ...f, pengadministrasi_kebutuhan: v }))}
                  width="w-24"
                />
              </div>
              <p className="text-xs pt-2 border-t border-slate-100 dark:border-slate-700/60 text-slate-500 dark:text-slate-400">
                Jumlah: <strong className="text-slate-800 dark:text-slate-200">{pengadministrasiJumlah}</strong>{" "}
                &middot; Kurang/Lebih:{" "}
                <strong className="text-slate-800 dark:text-slate-200">
                  {angka(kurangLebih(pengadministrasiJumlah, form.pengadministrasi_kebutuhan))}
                </strong>
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">
              Pengelola Layanan Operasional
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm text-slate-600 dark:text-slate-300">Bazzeting</label>
                <NumberCell
                  value={form.pengelola_bazzeting}
                  disabled={!canEdit}
                  onChange={(v) => setForm((f) => ({ ...f, pengelola_bazzeting: v }))}
                  width="w-24"
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm text-slate-600 dark:text-slate-300">Kebutuhan</label>
                <NumberCell
                  value={form.pengelola_kebutuhan}
                  disabled={!canEdit}
                  onChange={(v) => setForm((f) => ({ ...f, pengelola_kebutuhan: v }))}
                  width="w-24"
                />
              </div>
              <p className="text-xs pt-2 border-t border-slate-100 dark:border-slate-700/60 text-slate-500 dark:text-slate-400">
                Kurang/Lebih:{" "}
                <strong className="text-slate-800 dark:text-slate-200">
                  {angka(kurangLebih(form.pengelola_bazzeting, form.pengelola_kebutuhan))}
                </strong>
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">
              Penata Layanan Operasional
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm text-slate-600 dark:text-slate-300">Bazzeting</label>
                <NumberCell
                  value={form.penata_bazzeting}
                  disabled={!canEdit}
                  onChange={(v) => setForm((f) => ({ ...f, penata_bazzeting: v }))}
                  width="w-24"
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm text-slate-600 dark:text-slate-300">Kebutuhan</label>
                <NumberCell
                  value={form.penata_kebutuhan}
                  disabled={!canEdit}
                  onChange={(v) => setForm((f) => ({ ...f, penata_kebutuhan: v }))}
                  width="w-24"
                />
              </div>
              <p className="text-xs pt-2 border-t border-slate-100 dark:border-slate-700/60 text-slate-500 dark:text-slate-400">
                Kurang/Lebih:{" "}
                <strong className="text-slate-800 dark:text-slate-200">
                  {angka(kurangLebih(form.penata_bazzeting, form.penata_kebutuhan))}
                </strong>
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="hidden print:block text-black">
        <p className="text-center font-semibold mb-4">
          ANALISIS KEBUTUHAN TENAGA ADMINISTRASI -- TAHUN AJARAN {tahunAjaran}
        </p>
        <table className="w-full text-xs border border-black">
          <thead>
            <tr className="border-b border-black">
              <th className="border-r border-black px-2 py-1 text-left">Kategori</th>
              <th className="border-r border-black px-2 py-1">Bazzeting</th>
              <th className="border-r border-black px-2 py-1">Kebutuhan</th>
              <th className="px-2 py-1">Kurang/Lebih</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-400">
              <td className="border-r border-black px-2 py-1">Penelaah Teknis Kebijakan</td>
              <td className="border-r border-black px-2 py-1 text-center">{form.penelaah_bazzeting ?? "-"}</td>
              <td className="border-r border-black px-2 py-1 text-center">{form.penelaah_kebutuhan ?? "-"}</td>
              <td className="px-2 py-1 text-center">
                {angka(kurangLebih(form.penelaah_bazzeting, form.penelaah_kebutuhan))}
              </td>
            </tr>
            <tr className="border-b border-slate-400">
              <td className="border-r border-black px-2 py-1">Pengadministrasi Perkantoran</td>
              <td className="border-r border-black px-2 py-1 text-center">{pengadministrasiJumlah}</td>
              <td className="border-r border-black px-2 py-1 text-center">{form.pengadministrasi_kebutuhan ?? "-"}</td>
              <td className="px-2 py-1 text-center">
                {angka(kurangLebih(pengadministrasiJumlah, form.pengadministrasi_kebutuhan))}
              </td>
            </tr>
            <tr className="border-b border-slate-400">
              <td className="border-r border-black px-2 py-1">Pengelola Layanan Operasional</td>
              <td className="border-r border-black px-2 py-1 text-center">{form.pengelola_bazzeting ?? "-"}</td>
              <td className="border-r border-black px-2 py-1 text-center">{form.pengelola_kebutuhan ?? "-"}</td>
              <td className="px-2 py-1 text-center">
                {angka(kurangLebih(form.pengelola_bazzeting, form.pengelola_kebutuhan))}
              </td>
            </tr>
            <tr>
              <td className="border-r border-black px-2 py-1">Penata Layanan Operasional</td>
              <td className="border-r border-black px-2 py-1 text-center">{form.penata_bazzeting ?? "-"}</td>
              <td className="border-r border-black px-2 py-1 text-center">{form.penata_kebutuhan ?? "-"}</td>
              <td className="px-2 py-1 text-center">
                {angka(kurangLebih(form.penata_bazzeting, form.penata_kebutuhan))}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// =====================================================================
// Tab 3 -- Kebersihan & Keamanan
// =====================================================================

type AnalisisKebutuhanKebersihanKeamanan = {
  tahun_ajaran: string;
  kebersihan_bazzeting: number | null;
  keamanan_bazzeting: number | null;
  keamanan_kebutuhan: number | null;
};

function emptyKebersihanKeamanan(tahunAjaran: string): AnalisisKebutuhanKebersihanKeamanan {
  return { tahun_ajaran: tahunAjaran, kebersihan_bazzeting: null, keamanan_bazzeting: null, keamanan_kebutuhan: null };
}

function KebersihanKeamananTab({ profil, tahunAjaran, setTahunAjaran }: TahunProps & { profil: ProfilSekolah | null }) {
  const canEdit = useCanEditAnalisisKebutuhan();

  const [form, setForm] = useState<AnalisisKebutuhanKebersihanKeamanan>(
    emptyKebersihanKeamanan(getTahunAjaranSaatIni())
  );
  const [jumlahMurid, setJumlahMurid] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const [siswaRes, rowRes] = await Promise.all([
      supabase.from("siswa01").select("id", { count: "exact", head: true }).eq("status_siswa", "Aktif"),
      supabase
        .from("analisis_kebutuhan_kebersihan_keamanan")
        .select("*")
        .eq("tahun_ajaran", tahunAjaran)
        .maybeSingle(),
    ]);

    if (siswaRes.error) {
      setError(siswaRes.error.message);
      setLoading(false);
      return;
    }
    setJumlahMurid(siswaRes.count ?? 0);

    if (rowRes.error) {
      setError(rowRes.error.message);
      setLoading(false);
      return;
    }
    setForm(rowRes.data ? (rowRes.data as AnalisisKebutuhanKebersihanKeamanan) : emptyKebersihanKeamanan(tahunAjaran));
    setLoading(false);
  }, [tahunAjaran]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const kebersihanKebutuhan = hitungKebutuhanKebersihan(jumlahMurid);

  async function handleAmbilDariGtk() {
    setFetching(true);
    setError(null);
    const supabase = createClient();
    // Hanya GTK aktif; dikelompokkan menurut datagtk.jenis_ptk_pdd
    const { data, error } = await supabase.from("datagtk").select("jenis_ptk_pdd").eq("status_aktif", "Y");
    setFetching(false);
    if (error) {
      setError(error.message);
      return;
    }
    const hitung = (jenis: string) => (data ?? []).filter((g) => g.jenis_ptk_pdd === jenis).length;
    setForm((f) => ({
      ...f,
      kebersihan_bazzeting: hitung("Petugas Kebersihan"),
      keamanan_bazzeting: hitung("Petugas Keamanan"),
    }));
  }

  async function handleSimpan() {
    setSaving(true);
    setSaved(false);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("analisis_kebutuhan_kebersihan_keamanan")
      .upsert({ ...form, tahun_ajaran: tahunAjaran }, { onConflict: "tahun_ajaran" });
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handlePrint() {
    setTimeout(() => window.print(), 50);
  }

  function handleExport() {
    const ws = buatSheetKebersihanKeamanan(form, kebersihanKebutuhan, profil?.nama_sekolah ?? "", jumlahMurid);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "KEBERSIHAN DAN KEAMANAN");
    XLSX.writeFile(wb, `Analisis-Kebutuhan-Kebersihan-Keamanan-${tahunAjaran.replace("/", "-")}.xlsx`);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 print:hidden">
        <input
          value={tahunAjaran}
          onChange={(e) => setTahunAjaran(e.target.value)}
          placeholder="2025/2026"
          className="w-32 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm text-center bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <div className="flex items-center gap-2">
          {canEdit && (
            <button
              onClick={handleAmbilDariGtk}
              disabled={fetching || loading}
              className="inline-flex items-center gap-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
            >
              {fetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
              Ambil dari data GTK
            </button>
          )}
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            <Download className="h-4 w-4" />
            Excel
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white text-sm font-medium px-3 py-2 hover:bg-indigo-700"
          >
            <Printer className="h-4 w-4" />
            Cetak
          </button>
          {canEdit && (
            <button
              onClick={handleSimpan}
              disabled={saving || loading}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 text-white text-sm font-medium px-3 py-2 hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Simpan
            </button>
          )}
          {saved && <span className="text-sm text-emerald-600 dark:text-emerald-400">Tersimpan.</span>}
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg px-3 py-2 mb-4 print:hidden">
          {error}
        </p>
      )}

      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 print:hidden">
        Jumlah Murid Aktif: <strong>{jumlahMurid}</strong> (Kebutuhan Kebersihan = Jumlah Murid / 200)
      </p>

      {loading ? (
        <div className="flex justify-center py-10 print:hidden">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400 dark:text-slate-500" />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4 print:hidden">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">Petugas Kebersihan</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm text-slate-600 dark:text-slate-300">Bazzeting</label>
                <NumberCell
                  value={form.kebersihan_bazzeting}
                  disabled={!canEdit}
                  onChange={(v) => setForm((f) => ({ ...f, kebersihan_bazzeting: v }))}
                  width="w-24"
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm text-slate-600 dark:text-slate-300">Kebutuhan</label>
                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{kebersihanKebutuhan}</span>
              </div>
              <p className="text-xs pt-2 border-t border-slate-100 dark:border-slate-700/60 text-slate-500 dark:text-slate-400">
                Kurang/Lebih:{" "}
                <strong className="text-slate-800 dark:text-slate-200">
                  {angka(kurangLebih(form.kebersihan_bazzeting, kebersihanKebutuhan))}
                </strong>
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">Petugas Keamanan</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm text-slate-600 dark:text-slate-300">Bazzeting</label>
                <NumberCell
                  value={form.keamanan_bazzeting}
                  disabled={!canEdit}
                  onChange={(v) => setForm((f) => ({ ...f, keamanan_bazzeting: v }))}
                  width="w-24"
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm text-slate-600 dark:text-slate-300">Kebutuhan</label>
                <NumberCell
                  value={form.keamanan_kebutuhan}
                  disabled={!canEdit}
                  onChange={(v) => setForm((f) => ({ ...f, keamanan_kebutuhan: v }))}
                  width="w-24"
                />
              </div>
              <p className="text-xs pt-2 border-t border-slate-100 dark:border-slate-700/60 text-slate-500 dark:text-slate-400">
                Kurang/Lebih:{" "}
                <strong className="text-slate-800 dark:text-slate-200">
                  {angka(kurangLebih(form.keamanan_bazzeting, form.keamanan_kebutuhan))}
                </strong>
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="hidden print:block text-black">
        <p className="text-center font-semibold">ANALISIS KEBUTUHAN</p>
        <p className="text-center font-semibold mb-4">PETUGAS KEBERSIHAN DAN PETUGAS KEAMANAN</p>
        <table className="w-full text-sm border border-black">
          <thead>
            <tr className="border-b border-black">
              <th className="border-r border-black px-2 py-1 text-left">Petugas</th>
              <th className="border-r border-black px-2 py-1">Bazzeting</th>
              <th className="border-r border-black px-2 py-1">Kebutuhan</th>
              <th className="px-2 py-1">Kurang/Lebih</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-400">
              <td className="border-r border-black px-2 py-1">Kebersihan</td>
              <td className="border-r border-black px-2 py-1 text-center">{form.kebersihan_bazzeting ?? "-"}</td>
              <td className="border-r border-black px-2 py-1 text-center">{kebersihanKebutuhan}</td>
              <td className="px-2 py-1 text-center">
                {angka(kurangLebih(form.kebersihan_bazzeting, kebersihanKebutuhan))}
              </td>
            </tr>
            <tr>
              <td className="border-r border-black px-2 py-1">Keamanan</td>
              <td className="border-r border-black px-2 py-1 text-center">{form.keamanan_bazzeting ?? "-"}</td>
              <td className="border-r border-black px-2 py-1 text-center">{form.keamanan_kebutuhan ?? "-"}</td>
              <td className="px-2 py-1 text-center">
                {angka(kurangLebih(form.keamanan_bazzeting, form.keamanan_kebutuhan))}
              </td>
            </tr>
          </tbody>
        </table>

        <div className="flex justify-end mt-8">
          <div className="text-sm text-center">
            <p>
              {profil?.kota_kabupaten || "Tarakan"}, {formatTanggalIndonesia(new Date())}
            </p>
            <p>KEPALA SEKOLAH</p>
            <div className="h-14" />
            <p className="underline">{profil?.nama_kepala_sekolah || "________________"}</p>
            {profil?.nip_kepala_sekolah && <p>NIP. {profil.nip_kepala_sekolah}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

// =====================================================================
// Halaman utama
// =====================================================================

function gabungRowsGuru(
  tahunAjaran: string,
  existingRows: AnalisisKebutuhanGuru[],
  pelajaran: PelajaranRef[],
  gtkList: { id: string; kompetensi: string | null }[],
  penugasanList: { gtk_id: string; jam_tugas_tambahan: string | null }[]
): AnalisisKebutuhanGuru[] {
  // Waka/Perpus/Lab selalu dari jam_tugas_tambahan penugasan (>= 12 dihitung 12)
  const wakaPerMapel = hitungWakaPerpusLabPerMapel(gtkList, penugasanList);
  const existing = new Map(existingRows.map((r) => [r.mapel, r]));
  return MAPEL_KEBUTUHAN_GURU.map((mapel) => {
    const found = existing.get(mapel);
    // Rombel VII/VIII/IX, jumlah rombel, dan JJM selalu dari tabel pelajaran
    const turunan = turunanDariPelajaran(mapel, pelajaran);
    const waka = wakaPerMapel[mapel] ?? 0;
    if (found) return { ...found, ...turunan, waka_perpus_lab: waka };
    return {
      tahun_ajaran: tahunAjaran,
      mapel,
      guru_pns: 0,
      guru_pppk: 0,
      guru_honor: 0,
      abk: null,
      rombel_7: 0,
      rombel_8: 0,
      rombel_9: 0,
      jjm: null,
      ...turunan,
      waka_perpus_lab: waka,
    };
  });
}

function barisExcelGuru(rows: AnalisisKebutuhanGuru[]) {
  return rows.map((r, idx) => ({
      NO: idx + 1,
      "MATA PELAJARAN": r.mapel,
      PNS: r.guru_pns,
      PPPK: r.guru_pppk,
      HONOR: r.guru_honor,
      JUMLAH: hitungJumlahGuru(r),
      "KEBUTUHAN PNS": hitungKebutuhanPns(r),
      ABK: hitungAbk(r),
      "KELAS 7": r.rombel_7,
      "KELAS 8": r.rombel_8,
      "KELAS 9": r.rombel_9,
      "JUMLAH ROMBEL": hitungJumlahRombel(r),
      "WAKA/PERPUS/LAB": r.waka_perpus_lab,
      JJM: r.jjm ?? "",
      "JML JJM": hitungJmlJjm(r),
      "TOTAL JAM (JJM)": hitungTotalJam(r),
      "KURANG/LEBIH": hitungKurangLebihGuru(r),
    }));
}

// Format sheet Tenaga Administrasi: satu baris per sekolah (lebar), header
// bertingkat 3 baris, lalu baris JUMLAH.
function buatSheetAdministrasi(form: AnalisisKebutuhanAdministrasi, namaSekolah: string, jumlahMurid: number) {
  const pns = form.pengadministrasi_pns;
  const pppk = form.pengadministrasi_pppk;
  const honor = form.pengadministrasi_honor;
  const pengadBazzeting = (pns ?? 0) + (pppk ?? 0) + (honor ?? 0);
  const n = (v: number | null) => v ?? "";
  const kl = (bazzeting: number | null, kebutuhan: number | null) => kurangLebih(bazzeting, kebutuhan) ?? "";
  const z = (v: number | null) => v ?? 0;

  const aoa: (string | number | null)[][] = [
    [
      "NO", "NAMA SEKOLAH YANG ADA (SD/SMP)", "JUMLAH MURID",
      "PENELAAH TEKNIS KEBIJAKAN", null, null,
      "PENGADMINISTRASI PERKANTORAN", null, null, null, null,
      "PENGELOLAH LAYANAN OPERASIONAL", null, null,
      "PENATA LAYANAN OPERASIONAL", null, null,
    ],
    [
      null, null, null,
      "BAZZETING", "KEBUTUHAN", "KURANG/LEBIH",
      "BAZZETING", null, null, "KEBUTUHAN", "KURANG/LEBIH",
      "BAZZETING", "KEBUTUHAN", "KURANG/LEBIH",
      "BAZZETING", "KEBUTUHAN", "KURANG/LEBIH",
    ],
    [null, null, null, null, null, null, "PNS", "PPPK", "NONOR", null, null, null, null, null, null, null, null],
    [
      1, namaSekolah, jumlahMurid,
      n(form.penelaah_bazzeting), n(form.penelaah_kebutuhan), kl(form.penelaah_bazzeting, form.penelaah_kebutuhan),
      n(pns), n(pppk), n(honor), n(form.pengadministrasi_kebutuhan), kl(pengadBazzeting, form.pengadministrasi_kebutuhan),
      n(form.pengelola_bazzeting), n(form.pengelola_kebutuhan), kl(form.pengelola_bazzeting, form.pengelola_kebutuhan),
      n(form.penata_bazzeting), n(form.penata_kebutuhan), kl(form.penata_bazzeting, form.penata_kebutuhan),
    ],
    [
      "JUMLAH", null, jumlahMurid,
      z(form.penelaah_bazzeting), z(form.penelaah_kebutuhan), z(form.penelaah_bazzeting) - z(form.penelaah_kebutuhan),
      n(pns), n(pppk), z(honor), z(form.pengadministrasi_kebutuhan), pengadBazzeting - z(form.pengadministrasi_kebutuhan),
      z(form.pengelola_bazzeting), z(form.pengelola_kebutuhan), z(form.pengelola_bazzeting) - z(form.pengelola_kebutuhan),
      z(form.penata_bazzeting), z(form.penata_kebutuhan), z(form.penata_bazzeting) - z(form.penata_kebutuhan),
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const m = (r1: number, c1: number, r2: number, c2: number): XLSX.Range => ({ s: { r: r1, c: c1 }, e: { r: r2, c: c2 } });
  ws["!merges"] = [
    m(0, 0, 2, 0), m(0, 1, 2, 1), m(0, 2, 2, 2),
    m(0, 3, 0, 5), m(0, 6, 0, 10), m(0, 11, 0, 13), m(0, 14, 0, 16),
    m(1, 3, 2, 3), m(1, 4, 2, 4), m(1, 5, 2, 5),
    m(1, 6, 1, 8), m(1, 9, 2, 9), m(1, 10, 2, 10),
    m(1, 11, 2, 11), m(1, 12, 2, 12), m(1, 13, 2, 13),
    m(1, 14, 2, 14), m(1, 15, 2, 15), m(1, 16, 2, 16),
    m(4, 0, 4, 1),
  ];
  ws["!cols"] = [{ wch: 5 }, { wch: 32 }, { wch: 14 }, ...Array(14).fill({ wch: 14 })];
  return ws;
}

// Format sheet Kebersihan & Keamanan: satu baris per sekolah (lebar), header
// 2 baris, lalu baris JUMLAH.
function buatSheetKebersihanKeamanan(
  form: AnalisisKebutuhanKebersihanKeamanan,
  kebersihanKebutuhan: number,
  namaSekolah: string,
  jumlahMurid: number
) {
  const n = (v: number | null) => v ?? "";
  const kl = (bazzeting: number | null, kebutuhan: number | null) => kurangLebih(bazzeting, kebutuhan) ?? "";
  const z = (v: number | null) => v ?? 0;

  const aoa: (string | number | null)[][] = [
    ["NO", "NAMA SEKOLAH YANG ADA (SD/SMP)", "JUMLAH MURID", "PETUGAS KEBERSIHAN", null, null, "PETUGAS KEAMANAN", null, null],
    [null, null, null, "BAZZETING", "KEBUTUHAN", "KURANG/LEBIH", "BAZZETING", "KEBUTUHAN", "KURANG/LEBIH"],
    [
      1, namaSekolah, jumlahMurid,
      n(form.kebersihan_bazzeting), kebersihanKebutuhan, kl(form.kebersihan_bazzeting, kebersihanKebutuhan),
      n(form.keamanan_bazzeting), n(form.keamanan_kebutuhan), kl(form.keamanan_bazzeting, form.keamanan_kebutuhan),
    ],
    [
      "JUMLAH", null, jumlahMurid,
      z(form.kebersihan_bazzeting), kebersihanKebutuhan, z(form.kebersihan_bazzeting) - kebersihanKebutuhan,
      z(form.keamanan_bazzeting), z(form.keamanan_kebutuhan), z(form.keamanan_bazzeting) - z(form.keamanan_kebutuhan),
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const m = (r1: number, c1: number, r2: number, c2: number): XLSX.Range => ({ s: { r: r1, c: c1 }, e: { r: r2, c: c2 } });
  ws["!merges"] = [m(0, 0, 1, 0), m(0, 1, 1, 1), m(0, 2, 1, 2), m(0, 3, 0, 5), m(0, 6, 0, 8), m(3, 0, 3, 1)];
  ws["!cols"] = [{ wch: 5 }, { wch: 32 }, { wch: 14 }, ...Array(6).fill({ wch: 14 })];
  return ws;
}

export default function AnalisisKebutuhanPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("guru");
  const [profil, setProfil] = useState<ProfilSekolah | null>(null);
  const [tahunAjaran, setTahunAjaran] = useState(getTahunAjaranSaatIni());
  const [exportingAll, setExportingAll] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Satu file, 3 sheet -- berdasarkan data TERSIMPAN di database (Tenaga
  // Administrasi & Kebersihan/Keamanan) + hitungan otomatis (Guru), jadi
  // isian di tab yang belum di-Simpan tidak ikut.
  async function handleExportAll() {
    setExportingAll(true);
    setExportError(null);
    const supabase = createClient();
    const [siswaRes, guruRes, pelajaranRes, gtkRes, penugasanRes, admRes, kkRes] = await Promise.all([
      supabase.from("siswa01").select("id", { count: "exact", head: true }).eq("status_siswa", "Aktif"),
      supabase.from("analisis_kebutuhan_guru").select("*").eq("tahun_ajaran", tahunAjaran),
      supabase.from("pelajaran").select("mapel, jjm, jml_rombel7, jml_rombel8, jml_rombel9, jumlah_rombel"),
      ambilGtkGuruAktif(supabase),
      ambilPenugasanTahun(supabase, tahunAjaran),
      supabase.from("analisis_kebutuhan_administrasi").select("*").eq("tahun_ajaran", tahunAjaran).maybeSingle(),
      supabase.from("analisis_kebutuhan_kebersihan_keamanan").select("*").eq("tahun_ajaran", tahunAjaran).maybeSingle(),
    ]);
    setExportingAll(false);
    const err = [siswaRes, guruRes, pelajaranRes, gtkRes, penugasanRes, admRes, kkRes].find((r) => r.error)?.error;
    if (err) {
      setExportError(err.message);
      return;
    }

    const rowsGuru = gabungRowsGuru(
      tahunAjaran,
      (guruRes.data ?? []) as AnalisisKebutuhanGuru[],
      (pelajaranRes.data ?? []) as PelajaranRef[],
      gtkRes.data ?? [],
      penugasanRes.data ?? []
    );
    const adm = admRes.data ? (admRes.data as AnalisisKebutuhanAdministrasi) : emptyAdministrasi(tahunAjaran);
    const kk = kkRes.data
      ? (kkRes.data as AnalisisKebutuhanKebersihanKeamanan)
      : emptyKebersihanKeamanan(tahunAjaran);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(barisExcelGuru(rowsGuru)), "GURU");
    XLSX.utils.book_append_sheet(wb, buatSheetAdministrasi(adm, profil?.nama_sekolah ?? "", siswaRes.count ?? 0), "TENAGA ADMINISTRASI");
    XLSX.utils.book_append_sheet(
      wb,
      buatSheetKebersihanKeamanan(
        kk,
        hitungKebutuhanKebersihan(siswaRes.count ?? 0),
        profil?.nama_sekolah ?? "",
        siswaRes.count ?? 0
      ),
      "KEBERSIHAN DAN KEAMANAN"
    );
    XLSX.writeFile(wb, `Analisis-Kebutuhan-${tahunAjaran.replace("/", "-")}.xlsx`);
  }

  useEffect(() => {
    async function fetchProfil() {
      const supabase = createClient();
      const { data } = await supabase.from("profil_sekolah").select("*").eq("id", 1).maybeSingle();
      setProfil(data ?? null);
    }
    fetchProfil();
  }, []);

  // Print landscape khusus laporan ini saja (tidak memengaruhi print laporan lain)
  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = "@page { size: landscape; margin: 10mm; }";
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div className="p-6 md:p-8 max-w-full mx-auto print:p-0">
      <a
        href="/laporan"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 mb-4 print:hidden"
      >
        <ChevronLeft className="h-4 w-4" />
        Kembali ke Laporan
      </a>

      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-1 print:hidden">
        Analisis Kebutuhan
      </h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 print:hidden">
        Analisis kebutuhan Guru, Tenaga Administrasi, dan Petugas Kebersihan &amp; Keamanan -- format sesuai
        laporan Dinas Pendidikan.
      </p>

      <div className="flex items-end justify-between gap-3 border-b border-slate-200 dark:border-slate-700 mb-6 print:hidden">
        <div className="flex gap-1">
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
        <button
          onClick={handleExportAll}
          disabled={exportingAll}
          className="mb-1.5 inline-flex items-center gap-2 rounded-lg bg-emerald-600 text-white text-sm font-medium px-3 py-2 hover:bg-emerald-700 disabled:opacity-50"
        >
          {exportingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Excel All
        </button>
      </div>
      {exportError && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg px-3 py-2 mb-4 print:hidden">
          {exportError}
        </p>
      )}

      {activeTab === "guru" && <GuruTab profil={profil} tahunAjaran={tahunAjaran} setTahunAjaran={setTahunAjaran} />}
      {activeTab === "administrasi" && <AdministrasiTab profil={profil} tahunAjaran={tahunAjaran} setTahunAjaran={setTahunAjaran} />}
      {activeTab === "kebersihan-keamanan" && <KebersihanKeamananTab profil={profil} tahunAjaran={tahunAjaran} setTahunAjaran={setTahunAjaran} />}
    </div>
  );
}
