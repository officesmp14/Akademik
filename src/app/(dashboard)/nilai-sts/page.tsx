"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRole } from "@/lib/role-context";
import { GuruMengajarKelas, Nilai, Pelajaran, getTahunAjaranSaatIni } from "@/types/nilai";
import { Loader2 } from "lucide-react";

type SiswaRingkas = { id: string; nama: string | null };

const KOLOM: { key: "sts" | "susulan_sts" | "remedial_sts"; label: string }[] = [
  { key: "sts", label: "STS" },
  { key: "susulan_sts", label: "Susulan" },
  { key: "remedial_sts", label: "Remedial" },
];

export default function InputNilaiStsPage() {
  const { gtkId } = useRole();
  const [assignments, setAssignments] = useState<GuruMengajarKelas[]>([]);
  const [pelajaranMap, setPelajaranMap] = useState<Map<number, Pelajaran>>(new Map());
  const [selectedKey, setSelectedKey] = useState<string>("");
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

    const [siswaRes, nilaiRes] = await Promise.all([
      supabase
        .from("siswa01")
        .select("id, nama")
        .eq("rombel", rombel)
        .eq("status_siswa", "Aktif")
        .order("nama", { ascending: true }),
      supabase
        .from("nilai")
        .select("*")
        .eq("mapel_id", mapelId)
        .eq("rombel", rombel)
        .eq("tahun_ajaran", tahunAjaran)
        .eq("semester", semester)
        .in("jenis", ["sts", "susulan_sts", "remedial_sts"]),
    ]);

    if (siswaRes.error) {
      setError(siswaRes.error.message);
      setLoading(false);
      return;
    }

    setSiswaList(siswaRes.data ?? []);
    const nRows: Nilai[] = nilaiRes.data ?? [];

    const newValues: Record<string, Record<string, string>> = {};
    for (const row of nRows) {
      if (!newValues[row.siswa_id]) newValues[row.siswa_id] = {};
      newValues[row.siswa_id][row.jenis] = String(row.nilai);
    }
    setValues(newValues);

    setLoading(false);
  }, [mapelId, rombel, tahunAjaran, semester, gtkId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function getValue(siswaId: string, colKey: string): string {
    return values[siswaId]?.[colKey] ?? "";
  }

  function setValue(siswaId: string, colKey: string, val: string) {
    setValues((prev) => ({
      ...prev,
      [siswaId]: { ...prev[siswaId], [colKey]: val },
    }));
  }

  async function saveCell(siswaId: string, jenis: "sts" | "susulan_sts" | "remedial_sts", rawValue: string) {
    if (rawValue.trim() === "") return;
    const nilaiNum = Number(rawValue);
    if (isNaN(nilaiNum) || nilaiNum < 0 || nilaiNum > 100) {
      setError("Nilai harus angka 0-100.");
      return;
    }

    const namaKomponen =
      jenis === "sts" ? "STS" : jenis === "susulan_sts" ? "Susulan STS" : "Remedial STS";

    setSavingCell(`${siswaId}:${jenis}`);
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
    }
    // Update state lokal saja, tidak perlu reload semua data
    setValues((prev) => ({
      ...prev,
      [siswaId]: { ...prev[siswaId], [jenis]: rawValue },
    }));
  }

  /**
   * Tempel dari Excel: kalau isi clipboard punya lebih dari 1 baris/kolom
   * (artinya user blok banyak sel di Excel), isi otomatis ke bawah & ke
   * kanan sesuai posisi sel yang ditempel. Kalau cuma 1 nilai, biarkan
   * paste normal seperti biasa (jalan default browser).
   */
  function handlePaste(
    e: React.ClipboardEvent<HTMLInputElement>,
    rowIndex: number,
    colIndex: number
  ) {
    const text = e.clipboardData.getData("text");
    if (!text) return;

    const rows = text
      .split(/\r\n|\r|\n/)
      .filter((line, i, arr) => !(i === arr.length - 1 && line === ""))
      .map((line) => line.split("\t"));

    const isBulkPaste = rows.length > 1 || rows[0].length > 1;
    if (!isBulkPaste) return; // biarkan default, cuma 1 nilai

    e.preventDefault();

    rows.forEach((cols, i) => {
      const targetRow = rowIndex + i;
      if (targetRow >= siswaList.length) return;
      const siswaId = siswaList[targetRow].id;

      cols.forEach((rawVal, j) => {
        const targetCol = colIndex + j;
        if (targetCol >= KOLOM.length) return;
        const val = rawVal.trim();
        if (val === "") return;

        const colKey = KOLOM[targetCol].key;
        setValue(siswaId, colKey, val);
        saveCell(siswaId, colKey, val);
      });
    });
  }

  // Peringkat: berdasarkan nilai TERTINGGI di antara STS/Susulan/Remedial
  const peringkatMap = useMemo(() => {
    const efektif = siswaList.map((s) => {
      const vals = KOLOM.map((k) => getValue(s.id, k.key)).filter((v) => v !== "").map(Number);
      const nilaiEfektif = vals.length > 0 ? Math.max(...vals) : null;
      return { id: s.id, nilaiEfektif };
    });

    const withValue = efektif
      .filter((e) => e.nilaiEfektif !== null)
      .sort((a, b) => (b.nilaiEfektif! - a.nilaiEfektif!));

    const map: Record<string, number> = {};
    let rank = 0;
    let lastValue: number | null = null;
    for (const e of withValue) {
      if (e.nilaiEfektif !== lastValue) {
        rank += 1;
        lastValue = e.nilaiEfektif;
      }
      map[e.id] = rank;
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siswaList, values]);

  if (!gtkId) {
    return (
      <div className="p-6 md:p-8 max-w-3xl mx-auto">
        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-6">
          <h1 className="text-lg font-semibold text-amber-800 dark:text-amber-400 mb-2">Profil Belum Terhubung</h1>
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Akun Anda belum terhubung ke data GTK. Hubungi admin untuk menghubungkannya.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-1">Input Nilai STS</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
        Peringkat dihitung otomatis dari nilai tertinggi antara STS, Susulan, dan Remedial. Sudah
        punya nilai di Excel dengan urutan siswa yang sama? Blok kolom nilainya di Excel, salin
        (Ctrl+C), klik sel pertama di tabel bawah, lalu tempel (Ctrl+V) — otomatis terisi ke bawah.
      </p>

      {assignments.length === 0 ? (
        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-6">
          <p className="text-sm text-amber-700 dark:text-amber-400">
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
              className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg px-3 py-2 mb-4">
              {error}
            </p>
          )}

          {loading ? (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-10 flex justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400 dark:text-slate-500" />
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-x-auto">
              <table className="w-full text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40 text-left text-slate-500 dark:text-slate-400">
                    <th className="px-3 py-2.5 font-medium">No</th>
                    <th className="px-3 py-2.5 font-medium">Siswa</th>
                    {KOLOM.map((k) => (
                      <th key={k.key} className="px-3 py-2.5 font-medium text-center">
                        {k.label}
                      </th>
                    ))}
                    <th className="px-3 py-2.5 font-medium text-center">Peringkat</th>
                  </tr>
                </thead>
                <tbody>
                  {siswaList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-slate-400 dark:text-slate-500">
                        Tidak ada siswa aktif di kelas ini.
                      </td>
                    </tr>
                  ) : (
                    siswaList.map((s, idx) => (
                      <tr key={s.id} className="border-b border-slate-100 dark:border-slate-700/60 last:border-0">
                        <td className="px-3 py-2 text-slate-500 dark:text-slate-400">{idx + 1}</td>
                        <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-200">{s.nama}</td>
                        {KOLOM.map((k, colIdx) => {
                          const cellId = `${s.id}:${k.key}`;
                          return (
                            <td key={k.key} className="px-2 py-1.5 text-center">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={getValue(s.id, k.key)}
                                onChange={(e) => setValue(s.id, k.key, e.target.value)}
                                onBlur={(e) => saveCell(s.id, k.key, e.target.value)}
                                onPaste={(e) => handlePaste(e, idx, colIdx)}
                                className="w-16 rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 px-2 py-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                              {savingCell === cellId && (
                                <Loader2 className="h-3 w-3 animate-spin inline ml-1 text-indigo-400" />
                              )}
                            </td>
                          );
                        })}
                        <td className="px-3 py-2 text-center font-semibold text-slate-800 dark:text-slate-200">
                          {peringkatMap[s.id] ?? "-"}
                        </td>
                      </tr>
                    ))
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
