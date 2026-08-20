"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRole } from "@/lib/role-context";
import {
  GuruMengajarKelas,
  PengaturanNilaiMapel,
  PengaturanBobotNilai,
  Nilai,
  Pelajaran,
  getTahunAjaranSaatIni,
  hitungNilaiAkhir,
} from "@/types/nilai";
import { Plus, X, Loader2, Check } from "lucide-react";

type SiswaRingkas = { id: string; nama: string | null };

const DEFAULT_BOBOT: Pick<
  PengaturanBobotNilai,
  "bobot_formatif" | "bobot_sumatif_materi" | "bobot_sa"
> = {
  bobot_formatif: 1,
  bobot_sumatif_materi: 2,
  bobot_sa: 2,
};
const DEFAULT_KKB = 75;

export default function InputNilaiPage() {
  const { gtkId } = useRole();
  const [assignments, setAssignments] = useState<GuruMengajarKelas[]>([]);
  const [pelajaranMap, setPelajaranMap] = useState<Map<number, Pelajaran>>(new Map());
  const [selectedKey, setSelectedKey] = useState<string>(""); // "mapelId|||rombel"
  const [semester, setSemester] = useState<"Ganjil" | "Genap">("Ganjil");
  const [tahunAjaran, setTahunAjaran] = useState(getTahunAjaranSaatIni());

  // Ambil default tahun ajaran & semester aktif dari Pengaturan Akademik (sekali saat mount)
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

  const [siswaList, setSiswaList] = useState<SiswaRingkas[]>([]);
  const [pengaturanKkb, setPengaturanKkb] = useState<PengaturanNilaiMapel | null>(null);
  const [bobotGlobal, setBobotGlobal] = useState<PengaturanBobotNilai | null>(null);
  const [formatifColumns, setFormatifColumns] = useState<string[]>([]);
  const [sumatifMateriColumns, setSumatifMateriColumns] = useState<string[]>([]);
  const [values, setValues] = useState<Record<string, Record<string, string>>>({});
  const [loading, setLoading] = useState(true);
  const [savingCell, setSavingCell] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [mapelIdStr, rombel] = selectedKey ? selectedKey.split("|||") : ["", ""];
  const mapelId = mapelIdStr ? Number(mapelIdStr) : 0;

  useEffect(() => {
    async function fetchAssignments() {
      if (!gtkId) {
        setLoading(false);
        return;
      }
      const supabase = createClient();
      const [{ data: gmk }, { data: pelajaran }] = await Promise.all([
        supabase.from("guru_mengajar_kelas").select("*").eq("gtk_id", gtkId),
        supabase.from("pelajaran").select("*"),
      ]);

      setAssignments(gmk ?? []);
      setPelajaranMap(new Map((pelajaran ?? []).map((p) => [p.id, p])));

      if (gmk && gmk.length > 0) {
        setSelectedKey(`${gmk[0].mapel_id}|||${gmk[0].rombel}`);
      } else {
        setLoading(false);
      }
    }
    fetchAssignments();
  }, [gtkId]);

  const loadData = useCallback(async () => {
    if (!mapelId || !rombel || !gtkId) return;
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const [siswaRes, kkbRes, bobotRes, nilaiRes] = await Promise.all([
      supabase
        .from("siswa01")
        .select("id, nama")
        .eq("rombel", rombel)
        .eq("status_siswa", "Aktif")
        .order("nama", { ascending: true }),
      supabase.from("pengaturan_nilai_mapel").select("*").eq("mapel_id", mapelId).maybeSingle(),
      supabase.from("pengaturan_bobot_nilai").select("*").eq("id", 1).maybeSingle(),
      supabase
        .from("nilai")
        .select("*")
        .eq("mapel_id", mapelId)
        .eq("rombel", rombel)
        .eq("tahun_ajaran", tahunAjaran)
        .eq("semester", semester),
    ]);

    if (siswaRes.error) {
      setError(siswaRes.error.message);
      setLoading(false);
      return;
    }

    setSiswaList(siswaRes.data ?? []);
    setPengaturanKkb(kkbRes.data ?? null);
    setBobotGlobal(bobotRes.data ?? null);
    const nRows: Nilai[] = nilaiRes.data ?? [];

    setFormatifColumns(
      Array.from(new Set(nRows.filter((n) => n.jenis === "formatif").map((n) => n.nama_komponen)))
    );
    setSumatifMateriColumns(
      Array.from(
        new Set(nRows.filter((n) => n.jenis === "sumatif_materi").map((n) => n.nama_komponen))
      )
    );

    const newValues: Record<string, Record<string, string>> = {};
    for (const row of nRows) {
      const colKey =
        row.jenis === "formatif" || row.jenis === "sumatif_materi"
          ? `${row.jenis}:${row.nama_komponen}`
          : row.jenis; // 'sts' atau 'sas'
      if (!newValues[row.siswa_id]) newValues[row.siswa_id] = {};
      newValues[row.siswa_id][colKey] = String(row.nilai);
    }
    setValues(newValues);

    setLoading(false);
  }, [mapelId, rombel, tahunAjaran, semester, gtkId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const bobot = bobotGlobal ?? DEFAULT_BOBOT;
  const kkb = pengaturanKkb?.kkb ?? DEFAULT_KKB;

  function getValue(siswaId: string, colKey: string): string {
    return values[siswaId]?.[colKey] ?? "";
  }

  function setValue(siswaId: string, colKey: string, val: string) {
    setValues((prev) => ({
      ...prev,
      [siswaId]: { ...prev[siswaId], [colKey]: val },
    }));
  }

  async function saveCell(siswaId: string, colKey: string, rawValue: string) {
    if (rawValue.trim() === "") return;
    const nilaiNum = Number(rawValue);
    if (isNaN(nilaiNum) || nilaiNum < 0 || nilaiNum > 100) {
      setError("Nilai harus angka 0-100.");
      return;
    }

    let jenis: Nilai["jenis"];
    let namaKomponen: string;
    if (colKey.startsWith("formatif:")) {
      jenis = "formatif";
      namaKomponen = colKey.slice("formatif:".length);
    } else if (colKey.startsWith("sumatif_materi:")) {
      jenis = "sumatif_materi";
      namaKomponen = colKey.slice("sumatif_materi:".length);
    } else {
      jenis = colKey as "sts" | "sas";
      namaKomponen = colKey.toUpperCase();
    }

    setSavingCell(`${siswaId}:${colKey}`);
    const supabase = createClient();

    const { error } = await supabase.from("nilai").upsert(
      {
        siswa_id: siswaId,
        gtk_id: gtkId,
        mapel_id: mapelId,
        rombel,
        tahun_ajaran: tahunAjaran,
        semester,
        jenis,
        nama_komponen: namaKomponen,
        nilai: nilaiNum,
      },
      { onConflict: "siswa_id,mapel_id,tahun_ajaran,semester,jenis,nama_komponen" }
    );

    setSavingCell(null);

    if (error) {
      setError(error.message);
    } else {
      loadData();
    }
  }

  function addColumn(kind: "formatif" | "sumatif_materi") {
    const label = kind === "formatif" ? "Formatif" : "Sumatif Lingkup Materi (Bab)";
    const nama = window.prompt(
      kind === "formatif"
        ? "Nama komponen Formatif baru (contoh: Tugas 1, Ulangan Harian 1):"
        : "Nama Bab/Materi baru (contoh: Bab 1, Bab 2):"
    );
    if (!nama || !nama.trim()) return;

    const existing = kind === "formatif" ? formatifColumns : sumatifMateriColumns;
    if (existing.includes(nama.trim())) {
      setError(`Nama komponen ${label} ini sudah ada.`);
      return;
    }

    if (kind === "formatif") {
      setFormatifColumns((prev) => [...prev, nama.trim()]);
    } else {
      setSumatifMateriColumns((prev) => [...prev, nama.trim()]);
    }
  }

  async function removeColumn(kind: "formatif" | "sumatif_materi", nama: string) {
    if (
      !window.confirm(`Hapus kolom "${nama}"? Semua nilai siswa untuk komponen ini akan terhapus.`)
    )
      return;

    const supabase = createClient();
    await supabase
      .from("nilai")
      .delete()
      .eq("mapel_id", mapelId)
      .eq("rombel", rombel)
      .eq("tahun_ajaran", tahunAjaran)
      .eq("semester", semester)
      .eq("jenis", kind)
      .eq("nama_komponen", nama);

    loadData();
  }

  const hasil = useMemo(() => {
    const map: Record<string, ReturnType<typeof hitungNilaiAkhir>> = {};
    for (const s of siswaList) {
      const formatifVals = formatifColumns
        .map((t) => getValue(s.id, `formatif:${t}`))
        .filter((v) => v !== "")
        .map(Number);
      const sumatifMateriVals = sumatifMateriColumns
        .map((t) => getValue(s.id, `sumatif_materi:${t}`))
        .filter((v) => v !== "")
        .map(Number);
      const sts = getValue(s.id, "sts");
      const sas = getValue(s.id, "sas");
      const saVals = [sts, sas].filter((v) => v !== "").map(Number);

      map[s.id] = hitungNilaiAkhir(formatifVals, sumatifMateriVals, saVals, bobot, kkb);
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siswaList, formatifColumns, sumatifMateriColumns, values, bobot, kkb]);

  if (!gtkId) {
    return (
      <div className="p-6 md:p-8 max-w-3xl mx-auto">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <h1 className="text-lg font-semibold text-amber-800 mb-2">Profil Belum Terhubung</h1>
          <p className="text-sm text-amber-700">
            Akun Anda belum terhubung ke data GTK. Hubungi admin untuk menghubungkannya.
          </p>
        </div>
      </div>
    );
  }

  const totalCols = formatifColumns.length + sumatifMateriColumns.length + 5;

  return (
    <div className="p-6 md:p-8">
      <h1 className="text-2xl font-semibold text-slate-900 mb-1">Input Nilai</h1>
      <p className="text-sm text-slate-500 mb-6">
        Format Kurikulum Merdeka — Nilai Akhir = (F×Formatif + S×Sumatif Materi + SA×rata-rata
        STS&amp;SAS) / total bobot
      </p>

      {assignments.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <p className="text-sm text-amber-700">
            Anda belum ditugaskan mengajar mapel/kelas manapun. Hubungi admin untuk mengaturnya
            lewat halaman Penugasan Mengajar Kelas.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-3 mb-5">
            <select
              value={selectedKey}
              onChange={(e) => setSelectedKey(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {assignments.map((a) => (
                <option key={`${a.mapel_id}|||${a.rombel}`} value={`${a.mapel_id}|||${a.rombel}`}>
                  {pelajaranMap.get(a.mapel_id)?.mapel || "Mapel"} - {a.rombel}
                </option>
              ))}
            </select>

            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value as "Ganjil" | "Genap")}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="Ganjil">Semester Ganjil</option>
              <option value="Genap">Semester Genap</option>
            </select>

            <input
              value={tahunAjaran}
              onChange={(e) => setTahunAjaran(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="2026/2027"
            />

            <button
              onClick={() => addColumn("formatif")}
              className="inline-flex items-center gap-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium px-3 py-2 hover:bg-slate-50"
            >
              <Plus className="h-4 w-4" />
              Kolom Formatif
            </button>
            <button
              onClick={() => addColumn("sumatif_materi")}
              className="inline-flex items-center gap-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium px-3 py-2 hover:bg-slate-50"
            >
              <Plus className="h-4 w-4" />
              Kolom Sumatif Materi
            </button>
          </div>

          {!pengaturanKkb && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
              Mapel <strong>{pelajaranMap.get(mapelId)?.mapel}</strong> belum ada KKB yang diatur —
              memakai default {DEFAULT_KKB}. Admin bisa aturnya di halaman Pengaturan Nilai.
            </p>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">
              {error}
            </p>
          )}

          {loading ? (
            <div className="bg-white border border-slate-200 rounded-xl p-10 flex justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
              <table className="w-full text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-400 text-xs">
                    <th className="px-3 py-1.5 sticky left-0 bg-slate-50" />
                    <th className="px-3 py-1.5 sticky left-10 bg-slate-50" />
                    {formatifColumns.length > 0 && (
                      <th className="px-2 py-1.5 text-center" colSpan={formatifColumns.length}>
                        Formatif (F)
                      </th>
                    )}
                    {sumatifMateriColumns.length > 0 && (
                      <th className="px-2 py-1.5 text-center" colSpan={sumatifMateriColumns.length}>
                        Sumatif Lingkup Materi (S)
                      </th>
                    )}
                    <th className="px-2 py-1.5 text-center" colSpan={2}>
                      Sumatif Akhir (SA)
                    </th>
                    <th colSpan={2} />
                  </tr>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
                    <th className="px-3 py-2.5 font-medium sticky left-0 bg-slate-50">No</th>
                    <th className="px-3 py-2.5 font-medium sticky left-10 bg-slate-50">Nama</th>
                    {formatifColumns.map((t) => (
                      <th key={`f:${t}`} className="px-3 py-2.5 font-medium text-center">
                        <div className="flex items-center justify-center gap-1">
                          {t}
                          <button onClick={() => removeColumn("formatif", t)} title="Hapus kolom">
                            <X className="h-3 w-3 text-slate-400 hover:text-red-500" />
                          </button>
                        </div>
                      </th>
                    ))}
                    {sumatifMateriColumns.map((t) => (
                      <th key={`s:${t}`} className="px-3 py-2.5 font-medium text-center">
                        <div className="flex items-center justify-center gap-1">
                          {t}
                          <button
                            onClick={() => removeColumn("sumatif_materi", t)}
                            title="Hapus kolom"
                          >
                            <X className="h-3 w-3 text-slate-400 hover:text-red-500" />
                          </button>
                        </div>
                      </th>
                    ))}
                    <th className="px-3 py-2.5 font-medium text-center">STS</th>
                    <th className="px-3 py-2.5 font-medium text-center">SAS</th>
                    <th className="px-3 py-2.5 font-medium text-center">Nilai Akhir</th>
                    <th className="px-3 py-2.5 font-medium text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {siswaList.length === 0 ? (
                    <tr>
                      <td colSpan={totalCols} className="px-3 py-8 text-center text-slate-400">
                        Tidak ada siswa aktif di kelas ini.
                      </td>
                    </tr>
                  ) : (
                    siswaList.map((s, idx) => {
                      const h = hasil[s.id];
                      return (
                        <tr key={s.id} className="border-b border-slate-100 last:border-0">
                          <td className="px-3 py-2 text-slate-500 sticky left-0 bg-white">{idx + 1}</td>
                          <td className="px-3 py-2 font-medium text-slate-800 sticky left-10 bg-white">
                            {s.nama}
                          </td>
                          {formatifColumns.map((t) => {
                            const colKey = `formatif:${t}`;
                            const cellId = `${s.id}:${colKey}`;
                            return (
                              <td key={colKey} className="px-2 py-1.5 text-center">
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={getValue(s.id, colKey)}
                                  onChange={(e) => setValue(s.id, colKey, e.target.value)}
                                  onBlur={(e) => saveCell(s.id, colKey, e.target.value)}
                                  className="w-16 rounded-md border border-slate-200 px-2 py-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                                {savingCell === cellId && (
                                  <Loader2 className="h-3 w-3 animate-spin inline ml-1 text-indigo-400" />
                                )}
                              </td>
                            );
                          })}
                          {sumatifMateriColumns.map((t) => {
                            const colKey = `sumatif_materi:${t}`;
                            const cellId = `${s.id}:${colKey}`;
                            return (
                              <td key={colKey} className="px-2 py-1.5 text-center">
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={getValue(s.id, colKey)}
                                  onChange={(e) => setValue(s.id, colKey, e.target.value)}
                                  onBlur={(e) => saveCell(s.id, colKey, e.target.value)}
                                  className="w-16 rounded-md border border-slate-200 px-2 py-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                                {savingCell === cellId && (
                                  <Loader2 className="h-3 w-3 animate-spin inline ml-1 text-indigo-400" />
                                )}
                              </td>
                            );
                          })}
                          <td className="px-2 py-1.5 text-center">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={getValue(s.id, "sts")}
                              onChange={(e) => setValue(s.id, "sts", e.target.value)}
                              onBlur={(e) => saveCell(s.id, "sts", e.target.value)}
                              className="w-16 rounded-md border border-slate-200 px-2 py-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={getValue(s.id, "sas")}
                              onChange={(e) => setValue(s.id, "sas", e.target.value)}
                              onBlur={(e) => saveCell(s.id, "sas", e.target.value)}
                              className="w-16 rounded-md border border-slate-200 px-2 py-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </td>
                          <td className="px-3 py-2 text-center font-semibold text-slate-800">
                            {h?.nilaiAkhir ?? "-"}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {h?.tuntas === null || h?.tuntas === undefined ? (
                              <span className="text-slate-300">-</span>
                            ) : h.tuntas ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600">
                                <Check className="h-3 w-3" /> Tuntas
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
                                Belum Tuntas
                              </span>
                            )}
                          </td>
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
