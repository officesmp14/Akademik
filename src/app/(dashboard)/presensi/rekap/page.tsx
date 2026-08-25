"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRole } from "@/lib/role-context";
import { compareKelas } from "@/lib/rekap-siswa";
import { Pelajaran, getTahunAjaranSaatIni, getSemesterSaatIni } from "@/types/nilai";
import { STATUS_PRESENSI_OPTIONS, StatusPresensi } from "@/types/presensi";
import { Loader2 } from "lucide-react";

type SiswaRingkas = { id: string; nama: string | null };

type RekapRow = {
  siswa: SiswaRingkas;
  counts: Record<StatusPresensi, number>;
  total: number;
};

function emptyCounts(): Record<StatusPresensi, number> {
  return { H: 0, S: 0, I: 0, L: 0, M: 0, A: 0, P: 0, G: 0, D: 0 };
}

export default function RekapPresensiPage() {
  const { role, gtkId, waliKelasRombel } = useRole();
  const isFullAccessRole = role === "admin" || role === "kepala_sekolah";
  const lockedToOwnClass = !isFullAccessRole && Boolean(waliKelasRombel);

  const [rombelOptions, setRombelOptions] = useState<string[]>([]);
  const [selectedRombel, setSelectedRombel] = useState<string>("");
  const [mapelOptions, setMapelOptions] = useState<Pelajaran[]>([]);
  const [selectedMapelId, setSelectedMapelId] = useState<string>(""); // "" = semua mapel
  const [semester, setSemester] = useState<"Ganjil" | "Genap">(getSemesterSaatIni());
  const [tahunAjaran, setTahunAjaran] = useState(getTahunAjaranSaatIni());

  const [rows, setRows] = useState<RekapRow[]>([]);
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

  // Daftar mapel (untuk dropdown filter, sama untuk semua role)
  useEffect(() => {
    async function fetchMapel() {
      const supabase = createClient();
      const { data } = await supabase.from("pelajaran").select("*").order("mapel", { ascending: true });
      setMapelOptions(data ?? []);
    }
    fetchMapel();
  }, []);

  // Tentukan pilihan rombel sesuai role: wali kelas -> kelasnya sendiri;
  // admin/kepsek -> semua rombel; guru biasa -> kelas yang dia ajar saja.
  useEffect(() => {
    async function initRombel() {
      const supabase = createClient();

      if (lockedToOwnClass) {
        setSelectedRombel(waliKelasRombel!);
        return;
      }

      if (isFullAccessRole) {
        const { data } = await supabase.from("siswa01").select("rombel").not("rombel", "is", null);
        const unique = Array.from(
          new Set((data ?? []).map((r) => r.rombel).filter(Boolean) as string[])
        ).sort(compareKelas);
        setRombelOptions(unique);
        if (unique.length > 0) setSelectedRombel(unique[0]);
        return;
      }

      if (gtkId) {
        const { data } = await supabase.from("guru_mengajar_kelas").select("rombel").eq("gtk_id", gtkId);
        const unique = Array.from(
          new Set((data ?? []).map((r) => r.rombel).filter(Boolean) as string[])
        ).sort(compareKelas);
        setRombelOptions(unique);
        if (unique.length > 0) setSelectedRombel(unique[0]);
      } else {
        setLoading(false);
      }
    }
    initRombel();
  }, [lockedToOwnClass, isFullAccessRole, waliKelasRombel, gtkId]);

  useEffect(() => {
    async function loadData() {
      if (!selectedRombel) return;
      setLoading(true);
      setError(null);
      const supabase = createClient();

      const mapelId = selectedMapelId ? Number(selectedMapelId) : null;

      let presensiQuery = supabase
        .from("presensi")
        .select("siswa_id, status")
        .eq("rombel", selectedRombel)
        .eq("tahun_ajaran", tahunAjaran)
        .eq("semester", semester);
      if (mapelId) presensiQuery = presensiQuery.eq("mapel_id", mapelId);

      const [siswaRes, presensiRes] = await Promise.all([
        supabase
          .from("siswa01")
          .select("id, nama")
          .eq("rombel", selectedRombel)
          .eq("status_siswa", "Aktif")
          .order("nama", { ascending: true }),
        presensiQuery,
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
      const presensiRows = (presensiRes.data ?? []) as { siswa_id: string; status: StatusPresensi }[];

      const result: RekapRow[] = siswaList.map((s) => {
        const counts = emptyCounts();
        for (const p of presensiRows) {
          if (p.siswa_id === s.id) counts[p.status] += 1;
        }
        const total = Object.values(counts).reduce((a, b) => a + b, 0);
        return { siswa: s, counts, total };
      });

      setRows(result);
      setLoading(false);
    }
    loadData();
  }, [selectedRombel, selectedMapelId, tahunAjaran, semester]);

  const noAccess = !isFullAccessRole && !lockedToOwnClass && rombelOptions.length === 0 && !loading;

  return (
    <div className="p-6 md:p-8">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-1">Rekap Presensi</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
        Rangkuman jumlah kehadiran siswa per status, untuk kelas &amp; periode yang dipilih
      </p>

      {noAccess ? (
        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-6">
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Anda belum ditugaskan mengajar mapel/kelas manapun dan bukan wali kelas. Hubungi admin
            untuk mengaturnya.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3 mb-5">
            {!lockedToOwnClass && (
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
              value={selectedMapelId}
              onChange={(e) => setSelectedMapelId(e.target.value)}
              className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Semua Mapel</option>
              {mapelOptions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.mapel}
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
                    <th className="px-3 py-2.5 font-medium">Nama</th>
                    {STATUS_PRESENSI_OPTIONS.map((s) => (
                      <th key={s.value} className="px-3 py-2.5 font-medium text-center" title={s.label}>
                        {s.value}
                      </th>
                    ))}
                    <th className="px-3 py-2.5 font-medium text-center">Total Sesi</th>
                    <th className="px-3 py-2.5 font-medium text-center">% Hadir</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={STATUS_PRESENSI_OPTIONS.length + 4}
                        className="px-3 py-10 text-center text-slate-400 dark:text-slate-500"
                      >
                        Tidak ada siswa aktif di kelas ini.
                      </td>
                    </tr>
                  ) : (
                    rows.map((r, idx) => {
                      const persenHadir =
                        r.total > 0 ? Math.round((r.counts.H / r.total) * 1000) / 10 : null;
                      return (
                        <tr
                          key={r.siswa.id}
                          className="border-b border-slate-100 dark:border-slate-700/60 last:border-0"
                        >
                          <td className="px-3 py-2 text-slate-500 dark:text-slate-400">{idx + 1}</td>
                          <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-200">
                            {r.siswa.nama}
                          </td>
                          {STATUS_PRESENSI_OPTIONS.map((s) => (
                            <td
                              key={s.value}
                              className="px-3 py-2 text-center text-slate-600 dark:text-slate-300"
                            >
                              {r.counts[s.value] || "-"}
                            </td>
                          ))}
                          <td className="px-3 py-2 text-center font-semibold text-slate-800 dark:text-slate-200">
                            {r.total}
                          </td>
                          <td className="px-3 py-2 text-center">
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
