"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRole } from "@/lib/role-context";
import {
  GuruMengajarKelas,
  Pelajaran,
  getTahunAjaranSaatIni,
  getSemesterSaatIni,
} from "@/types/nilai";
import { JAM_KE_OPTIONS, Presensi, STATUS_PRESENSI_OPTIONS, StatusPresensi } from "@/types/presensi";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

type SiswaRingkas = { id: string; nama: string | null };

function todayStr() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const STATUS_COLOR: Record<StatusPresensi, string> = {
  H: "bg-emerald-600 text-white",
  S: "bg-amber-500 text-white",
  I: "bg-sky-500 text-white",
  L: "bg-orange-500 text-white",
  M: "bg-rose-500 text-white",
  A: "bg-red-600 text-white",
  P: "bg-violet-500 text-white",
  G: "bg-fuchsia-500 text-white",
  D: "bg-teal-500 text-white",
};
const STATUS_COLOR_INACTIVE =
  "bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700";

export default function PresensiPage() {
  const { gtkId } = useRole();
  const [assignments, setAssignments] = useState<GuruMengajarKelas[]>([]);
  const [pelajaranMap, setPelajaranMap] = useState<Map<number, Pelajaran>>(new Map());
  const [selectedKey, setSelectedKey] = useState<string>(""); // "mapelId|||rombel"
  const [tanggal, setTanggal] = useState(todayStr());
  const [jamKe, setJamKe] = useState(1);
  const [semester, setSemester] = useState<"Ganjil" | "Genap">(getSemesterSaatIni());
  const [tahunAjaran, setTahunAjaran] = useState(getTahunAjaranSaatIni());

  const [siswaList, setSiswaList] = useState<SiswaRingkas[]>([]);
  const [rows, setRows] = useState<Record<string, { status: StatusPresensi | ""; keterangan: string }>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [mapelIdStr, rombel] = selectedKey ? selectedKey.split("|||") : ["", ""];
  const mapelId = mapelIdStr ? Number(mapelIdStr) : 0;

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
    if (!mapelId || !rombel || !gtkId || !tanggal) return;
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const [siswaRes, presensiRes] = await Promise.all([
      supabase
        .from("siswa01")
        .select("id, nama")
        .eq("rombel", rombel)
        .eq("status_siswa", "Aktif")
        .order("nama", { ascending: true }),
      supabase
        .from("presensi")
        .select("*")
        .eq("mapel_id", mapelId)
        .eq("rombel", rombel)
        .eq("tanggal", tanggal)
        .eq("jam_ke", jamKe),
    ]);

    if (siswaRes.error) {
      setError(siswaRes.error.message);
      setLoading(false);
      return;
    }

    setSiswaList(siswaRes.data ?? []);

    const existing: Presensi[] = presensiRes.data ?? [];
    const newRows: Record<string, { status: StatusPresensi | ""; keterangan: string }> = {};
    for (const s of siswaRes.data ?? []) {
      const found = existing.find((p) => p.siswa_id === s.id);
      newRows[s.id] = {
        status: found?.status ?? "",
        keterangan: found?.keterangan ?? "",
      };
    }
    setRows(newRows);

    setLoading(false);
  }, [mapelId, rombel, gtkId, tanggal, jamKe]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function saveStatus(siswaId: string, status: StatusPresensi) {
    setRows((prev) => ({
      ...prev,
      [siswaId]: { status, keterangan: prev[siswaId]?.keterangan ?? "" },
    }));
    setSavingId(siswaId);
    setError(null);
    const supabase = createClient();

    const { error } = await supabase.from("presensi").upsert(
      {
        siswa_id: siswaId,
        gtk_id: gtkId,
        mapel_id: mapelId,
        rombel,
        tanggal,
        jam_ke: jamKe,
        status,
        keterangan: rows[siswaId]?.keterangan?.trim() || null,
        tahun_ajaran: tahunAjaran,
        semester,
      },
      { onConflict: "siswa_id,mapel_id,rombel,tanggal,jam_ke" }
    );

    setSavingId(null);
    if (error) setError(error.message);
  }

  function setKeterangan(siswaId: string, keterangan: string) {
    setRows((prev) => ({
      ...prev,
      [siswaId]: { status: prev[siswaId]?.status ?? "", keterangan },
    }));
  }

  async function saveKeterangan(siswaId: string) {
    const row = rows[siswaId];
    if (!row?.status) return;
    setSavingId(siswaId);
    setError(null);
    const supabase = createClient();

    const { error } = await supabase.from("presensi").upsert(
      {
        siswa_id: siswaId,
        gtk_id: gtkId,
        mapel_id: mapelId,
        rombel,
        tanggal,
        jam_ke: jamKe,
        status: row.status,
        keterangan: row.keterangan.trim() || null,
        tahun_ajaran: tahunAjaran,
        semester,
      },
      { onConflict: "siswa_id,mapel_id,rombel,tanggal,jam_ke" }
    );

    setSavingId(null);
    if (error) setError(error.message);
  }

  async function tandaiSemuaHadir() {
    if (siswaList.length === 0) return;
    setError(null);
    const supabase = createClient();

    const belumHadir = siswaList.filter((s) => rows[s.id]?.status !== "H");
    if (belumHadir.length === 0) return;

    setRows((prev) => {
      const next = { ...prev };
      for (const s of belumHadir) {
        next[s.id] = { status: "H", keterangan: next[s.id]?.keterangan ?? "" };
      }
      return next;
    });

    const payload = belumHadir.map((s) => ({
      siswa_id: s.id,
      gtk_id: gtkId,
      mapel_id: mapelId,
      rombel,
      tanggal,
      jam_ke: jamKe,
      status: "H" as StatusPresensi,
      keterangan: rows[s.id]?.keterangan?.trim() || null,
      tahun_ajaran: tahunAjaran,
      semester,
    }));

    const { error } = await supabase
      .from("presensi")
      .upsert(payload, { onConflict: "siswa_id,mapel_id,rombel,tanggal,jam_ke" });

    if (error) setError(error.message);
  }

  async function batalkanSemuaHadir() {
    const sudahHadir = siswaList.filter((s) => rows[s.id]?.status === "H");
    if (sudahHadir.length === 0) return;
    setError(null);
    const supabase = createClient();

    setRows((prev) => {
      const next = { ...prev };
      for (const s of sudahHadir) {
        next[s.id] = { status: "", keterangan: "" };
      }
      return next;
    });

    // Kolom status wajib diisi salah satu kode (tidak ada nilai "kosong" di
    // database), jadi cara membatalkan tanda H adalah menghapus baris
    // presensinya, bukan mengosongkan kolomnya.
    const { error } = await supabase
      .from("presensi")
      .delete()
      .eq("mapel_id", mapelId)
      .eq("rombel", rombel)
      .eq("tanggal", tanggal)
      .eq("jam_ke", jamKe)
      .eq("status", "H")
      .in(
        "siswa_id",
        sudahHadir.map((s) => s.id)
      );

    if (error) setError(error.message);
  }

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

  const jumlahTerisi = siswaList.filter((s) => rows[s.id]?.status).length;

  return (
    <div className="p-6 md:p-8">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-1">Presensi</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
        Catat kehadiran siswa per mata pelajaran yang Anda ajar
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
          <div className="flex flex-wrap items-center gap-3 mb-5">
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

            <input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />

            <select
              value={jamKe}
              onChange={(e) => setJamKe(Number(e.target.value))}
              className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {JAM_KE_OPTIONS.map((j) => (
                <option key={j} value={j}>
                  Jam ke-{j}
                </option>
              ))}
            </select>

            {siswaList.length > 0 && (
              <button
                onClick={tandaiSemuaHadir}
                className="inline-flex items-center gap-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                Tandai Semua Hadir
              </button>
            )}

            {siswaList.length > 0 && (
              <button
                onClick={batalkanSemuaHadir}
                className="inline-flex items-center gap-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                Batalkan Semua Hadir
              </button>
            )}

            {!loading && siswaList.length > 0 && (
              <span className="text-xs text-slate-400 dark:text-slate-500">
                {jumlahTerisi} / {siswaList.length} siswa sudah dicatat
              </span>
            )}
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
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40 text-left text-slate-500 dark:text-slate-400">
                    <th className="px-4 py-3 font-medium w-12">No</th>
                    <th className="px-4 py-3 font-medium">Nama</th>
                    <th className="px-4 py-3 font-medium text-center">Status</th>
                    <th className="px-4 py-3 font-medium">Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {siswaList.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500">
                        Tidak ada siswa aktif di kelas ini.
                      </td>
                    </tr>
                  ) : (
                    siswaList.map((s, idx) => {
                      const row = rows[s.id] ?? { status: "" as StatusPresensi | "", keterangan: "" };
                      return (
                        <tr key={s.id} className="border-b border-slate-100 dark:border-slate-700/60 last:border-0">
                          <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{idx + 1}</td>
                          <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                            {s.nama}
                            {savingId === s.id && (
                              <Loader2 className="h-3 w-3 animate-spin inline ml-2 text-indigo-400" />
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-nowrap items-center justify-center gap-1.5">
                              {STATUS_PRESENSI_OPTIONS.map((opt) => (
                                <button
                                  key={opt.value}
                                  onClick={() => saveStatus(s.id, opt.value)}
                                  title={opt.label}
                                  className={`h-8 w-8 rounded-full text-xs font-semibold transition-colors ${
                                    row.status === opt.value
                                      ? STATUS_COLOR[opt.value]
                                      : STATUS_COLOR_INACTIVE
                                  }`}
                                >
                                  {opt.value}
                                </button>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={row.keterangan}
                              onChange={(e) => setKeterangan(s.id, e.target.value)}
                              onBlur={() => saveKeterangan(s.id)}
                              placeholder="Opsional"
                              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
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
