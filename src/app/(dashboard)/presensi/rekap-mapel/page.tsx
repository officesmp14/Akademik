"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRole } from "@/lib/role-context";
import {
  GuruMengajarKelas,
  Pelajaran,
  getTahunAjaranSaatIni,
  getSemesterSaatIni,
} from "@/types/nilai";
import { STATUS_PRESENSI_OPTIONS, StatusPresensi } from "@/types/presensi";
import { Loader2 } from "lucide-react";

type SiswaRingkas = { id: string; nama: string | null };

type Sesi = { tanggal: string; jam_ke: number };

function sesiKey(s: Sesi) {
  return `${s.tanggal}__${s.jam_ke}`;
}

type RekapRow = {
  siswa: SiswaRingkas;
  bySesi: Partial<Record<string, StatusPresensi>>;
  counts: Record<StatusPresensi, number>;
};

type MonthGroup = { label: string; sesiList: Sesi[] };

const BULAN_ID = [
  "JAN", "FEB", "MAR", "APR", "MEI", "JUN", "JUL", "AGU", "SEP", "OKT", "NOV", "DES",
];

function toDate(tanggal: string) {
  return new Date(`${tanggal}T00:00:00`);
}

function monthLabel(tanggal: string) {
  const d = toDate(tanggal);
  return `${BULAN_ID[d.getMonth()]} ${d.getFullYear()}`;
}

function dayOfMonth(tanggal: string) {
  return toDate(tanggal).getDate();
}

function groupByMonth(sesiList: Sesi[]): MonthGroup[] {
  const groups: MonthGroup[] = [];
  for (const s of sesiList) {
    const label = monthLabel(s.tanggal);
    const last = groups[groups.length - 1];
    if (last && last.label === label) {
      last.sesiList.push(s);
    } else {
      groups.push({ label, sesiList: [s] });
    }
  }
  return groups;
}

function emptyCounts(): Record<StatusPresensi, number> {
  return { H: 0, S: 0, I: 0, L: 0, M: 0, A: 0, P: 0, G: 0, D: 0 };
}

export default function RekapPresensiMapelPage() {
  const { gtkId } = useRole();
  const [assignments, setAssignments] = useState<GuruMengajarKelas[]>([]);
  const [pelajaranMap, setPelajaranMap] = useState<Map<number, Pelajaran>>(new Map());
  const [selectedKey, setSelectedKey] = useState<string>(""); // "mapelId|||rombel"
  const [semester, setSemester] = useState<"Ganjil" | "Genap">(getSemesterSaatIni());
  const [tahunAjaran, setTahunAjaran] = useState(getTahunAjaranSaatIni());

  const [monthGroups, setMonthGroups] = useState<MonthGroup[]>([]);
  const [rows, setRows] = useState<RekapRow[]>([]);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    async function loadData() {
      if (!mapelId || !rombel || !gtkId) return;
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
          .select("siswa_id, tanggal, jam_ke, status")
          .eq("mapel_id", mapelId)
          .eq("rombel", rombel)
          .eq("tahun_ajaran", tahunAjaran)
          .eq("semester", semester)
          .order("tanggal", { ascending: true })
          .order("jam_ke", { ascending: true }),
      ]);

      if (siswaRes.error) {
        setError(siswaRes.error.message);
        setLoading(false);
        return;
      }
      if (presensiRes.error) {
        setError(presensiRes.error.message);
        setLoading(false);
        return;
      }

      const siswaList: SiswaRingkas[] = siswaRes.data ?? [];
      const presensiRows = (presensiRes.data ?? []) as {
        siswa_id: string;
        tanggal: string;
        jam_ke: number;
        status: StatusPresensi;
      }[];

      const sesiMap = new Map<string, Sesi>();
      for (const p of presensiRows) {
        const s = { tanggal: p.tanggal, jam_ke: p.jam_ke };
        sesiMap.set(sesiKey(s), s);
      }
      const sesiList = Array.from(sesiMap.values()).sort((a, b) =>
        a.tanggal === b.tanggal ? a.jam_ke - b.jam_ke : a.tanggal.localeCompare(b.tanggal)
      );
      setMonthGroups(groupByMonth(sesiList));

      const result: RekapRow[] = siswaList.map((s) => {
        const bySesi: Partial<Record<string, StatusPresensi>> = {};
        const counts = emptyCounts();
        for (const p of presensiRows) {
          if (p.siswa_id !== s.id) continue;
          bySesi[sesiKey({ tanggal: p.tanggal, jam_ke: p.jam_ke })] = p.status;
          counts[p.status] += 1;
        }
        return { siswa: s, bySesi, counts };
      });

      setRows(result);
      setLoading(false);
    }
    loadData();
  }, [mapelId, rombel, gtkId, tahunAjaran, semester]);

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

  const totalSesi = monthGroups.reduce((acc, m) => acc + m.sesiList.length, 0);

  return (
    <div className="p-6 md:p-8">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-1">
        Rekap Presensi Mapel Saya
      </h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
        Jurnal kehadiran siswa per tanggal, khusus untuk mata pelajaran &amp; kelas yang Anda ajar
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
          ) : totalSesi === 0 ? (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-10 text-center text-slate-400 dark:text-slate-500">
              Belum ada data presensi untuk mapel &amp; kelas ini di periode yang dipilih.
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-x-auto">
              <table className="text-xs whitespace-nowrap border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40 text-slate-500 dark:text-slate-400">
                    <th
                      rowSpan={2}
                      className="border-r border-b border-slate-200 dark:border-slate-700 px-3 py-2 sticky left-0 bg-slate-50 dark:bg-slate-700/40 z-10"
                    >
                      No
                    </th>
                    <th
                      rowSpan={2}
                      className="border-r border-b border-slate-200 dark:border-slate-700 px-3 py-2 text-left sticky left-10 bg-slate-50 dark:bg-slate-700/40 z-10"
                    >
                      Nama Siswa
                    </th>
                    {monthGroups.map((m) => (
                      <th
                        key={m.label}
                        colSpan={m.sesiList.length}
                        className="border-r border-b border-slate-200 dark:border-slate-700 px-2 py-1.5 text-center"
                      >
                        {m.label}
                      </th>
                    ))}
                    <th
                      colSpan={STATUS_PRESENSI_OPTIONS.length}
                      className="border-r border-b border-slate-200 dark:border-slate-700 px-2 py-1.5 text-center"
                    >
                      Jumlah
                    </th>
                    <th
                      rowSpan={2}
                      className="border-b border-slate-200 dark:border-slate-700 px-3 py-2 text-center"
                    >
                      % Hadir
                    </th>
                  </tr>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40 text-slate-500 dark:text-slate-400">
                    {monthGroups.flatMap((m) =>
                      m.sesiList.map((s) => (
                        <th
                          key={sesiKey(s)}
                          title={`Jam ke-${s.jam_ke}`}
                          className="border-r border-slate-200 dark:border-slate-700 px-2 py-1 text-center font-normal leading-tight"
                        >
                          <div>{dayOfMonth(s.tanggal)}</div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500">j{s.jam_ke}</div>
                        </th>
                      ))
                    )}
                    {STATUS_PRESENSI_OPTIONS.map((s) => (
                      <th
                        key={s.value}
                        title={s.label}
                        className="border-r border-slate-200 dark:border-slate-700 px-2 py-1 text-center"
                      >
                        {s.value}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={2 + totalSesi + STATUS_PRESENSI_OPTIONS.length + 1}
                        className="px-3 py-10 text-center text-slate-400 dark:text-slate-500"
                      >
                        Tidak ada siswa aktif di kelas ini.
                      </td>
                    </tr>
                  ) : (
                    rows.map((r, idx) => {
                      const persenHadir =
                        totalSesi > 0 ? Math.round((r.counts.H / totalSesi) * 1000) / 10 : null;
                      return (
                        <tr key={r.siswa.id} className="border-b border-slate-100 dark:border-slate-700/60 last:border-0">
                          <td className="border-r border-slate-100 dark:border-slate-700/60 px-3 py-1.5 text-slate-500 dark:text-slate-400 sticky left-0 bg-white dark:bg-slate-800">
                            {idx + 1}
                          </td>
                          <td className="border-r border-slate-100 dark:border-slate-700/60 px-3 py-1.5 font-medium text-slate-800 dark:text-slate-200 sticky left-10 bg-white dark:bg-slate-800">
                            {r.siswa.nama}
                          </td>
                          {monthGroups.flatMap((m) =>
                            m.sesiList.map((s) => (
                              <td
                                key={sesiKey(s)}
                                className="border-r border-slate-100 dark:border-slate-700/60 px-2 py-1.5 text-center text-slate-600 dark:text-slate-300"
                              >
                                {r.bySesi[sesiKey(s)] ?? ""}
                              </td>
                            ))
                          )}
                          {STATUS_PRESENSI_OPTIONS.map((s) => (
                            <td
                              key={s.value}
                              className="border-r border-slate-100 dark:border-slate-700/60 px-2 py-1.5 text-center bg-slate-50 dark:bg-slate-700/30 text-slate-700 dark:text-slate-200"
                            >
                              {r.counts[s.value] || ""}
                            </td>
                          ))}
                          <td className="px-3 py-1.5 text-center">
                            {persenHadir === null ? (
                              <span className="text-slate-300 dark:text-slate-600">-</span>
                            ) : (
                              <span
                                className={
                                  persenHadir >= 90
                                    ? "text-emerald-600 dark:text-emerald-400 font-medium"
                                    : persenHadir >= 75
                                      ? "text-amber-600 dark:text-amber-400 font-medium"
                                      : "text-red-600 dark:text-red-400 font-medium"
                                }
                              >
                                {persenHadir}%
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
