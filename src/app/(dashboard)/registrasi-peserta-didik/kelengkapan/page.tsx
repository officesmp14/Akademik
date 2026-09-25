"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRole } from "@/lib/role-context";
import { compareKelas } from "@/lib/rekap-siswa";
import { ChevronLeft, Loader2 } from "lucide-react";

type SiswaRow = {
  id: string;
  nama: string | null;
  rombel: string | null;
  id_hobby: number | null;
  id_cita: number | null;
};

type Rekap = { kelas: string; total: number; hobi: number; cita: number; belumLengkap: number };

function persen(bagian: number, total: number): number {
  return total === 0 ? 0 : Math.round((bagian / total) * 1000) / 10;
}

function Bar({ nilai }: { nilai: number }) {
  return (
    <div className="flex items-center gap-2 min-w-[140px]">
      <div className="h-2 flex-1 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
        <div
          className={`h-full rounded-full ${nilai >= 100 ? "bg-emerald-500" : nilai >= 50 ? "bg-indigo-500" : "bg-amber-500"}`}
          style={{ width: `${Math.min(100, nilai)}%` }}
        />
      </div>
      <span className="w-12 text-right text-sm font-medium text-slate-700 dark:text-slate-200">{nilai}%</span>
    </div>
  );
}

export default function KelengkapanRegistrasiPage() {
  const { role, waliKelasRombel } = useRole();
  const isFullAccessRole = role === "admin" || role === "kepala_sekolah";
  const lockedToOwnClass = !isFullAccessRole && Boolean(waliKelasRombel);

  const [siswa, setSiswa] = useState<SiswaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kelasDipilih, setKelasDipilih] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const supabase = createClient();
      let query = supabase
        .from("siswa01")
        .select("id, nama, rombel, id_hobby, id_cita")
        .eq("status_siswa", "Aktif")
        .order("nama", { ascending: true });
      if (lockedToOwnClass && waliKelasRombel) query = query.eq("rombel", waliKelasRombel);

      const { data, error } = await query;
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      setSiswa((data ?? []) as SiswaRow[]);
      setLoading(false);
    }
    fetchData();
  }, [lockedToOwnClass, waliKelasRombel]);

  const perKelas = new Map<string, Rekap>();
  for (const s of siswa) {
    const kelas = s.rombel || "Tanpa Rombel";
    const r = perKelas.get(kelas) ?? { kelas, total: 0, hobi: 0, cita: 0, belumLengkap: 0 };
    r.total += 1;
    if (s.id_hobby != null) r.hobi += 1;
    if (s.id_cita != null) r.cita += 1;
    if (s.id_hobby == null || s.id_cita == null) r.belumLengkap += 1;
    perKelas.set(kelas, r);
  }
  const rekap = Array.from(perKelas.values()).sort((a, b) => compareKelas(a.kelas, b.kelas));
  const total = siswa.length;
  const hobi = siswa.filter((s) => s.id_hobby != null).length;
  const cita = siswa.filter((s) => s.id_cita != null).length;

  const belumLengkap = kelasDipilih
    ? siswa.filter(
        (s) => (s.rombel || "Tanpa Rombel") === kelasDipilih && (s.id_hobby == null || s.id_cita == null)
      )
    : [];

  return (
    <div className="p-6 md:p-8">
      <Link
        href="/registrasi-peserta-didik"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 mb-4"
      >
        <ChevronLeft className="h-4 w-4" />
        Kembali ke Registrasi Peserta Didik
      </Link>

      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Progres Hobi&amp;Cita</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-6">
        Persentase siswa aktif yang sudah diisi Hobi dan Cita-citanya di Registrasi Peserta Didik.
      </p>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg px-3 py-2 mb-4">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400 dark:text-slate-500" />
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            {[
              { label: "Hobi", isi: hobi },
              { label: "Cita-cita", isi: cita },
            ].map((k) => (
              <div
                key={k.label}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5"
              >
                <p className="text-sm text-slate-500 dark:text-slate-400">{k.label}</p>
                <p className="text-3xl font-semibold text-slate-900 dark:text-slate-100 mt-1">
                  {persen(k.isi, total)}%
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {k.isi} dari {total} siswa sudah diisi
                </p>
              </div>
            ))}
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40 text-left text-slate-500 dark:text-slate-400">
                  <th className="px-4 py-3 font-medium">Kelas</th>
                  <th className="px-4 py-3 font-medium text-center">Jumlah Siswa</th>
                  <th className="px-4 py-3 font-medium">Hobi</th>
                  <th className="px-4 py-3 font-medium">Cita-cita</th>
                  <th className="px-4 py-3 font-medium text-center">Belum Lengkap</th>
                </tr>
              </thead>
              <tbody>
                {rekap.map((r) => (
                  <tr
                    key={r.kelas}
                    onClick={() => setKelasDipilih((k) => (k === r.kelas ? null : r.kelas))}
                    className={`border-b border-slate-100 dark:border-slate-700/60 cursor-pointer hover:bg-slate-50/60 dark:hover:bg-slate-700 ${
                      kelasDipilih === r.kelas ? "bg-indigo-50/60 dark:bg-indigo-500/10" : ""
                    }`}
                  >
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{r.kelas}</td>
                    <td className="px-4 py-3 text-center text-slate-700 dark:text-slate-200">{r.total}</td>
                    <td className="px-4 py-3">
                      <Bar nilai={persen(r.hobi, r.total)} />
                    </td>
                    <td className="px-4 py-3">
                      <Bar nilai={persen(r.cita, r.total)} />
                    </td>
                    <td className="px-4 py-3 text-center text-slate-700 dark:text-slate-200">{r.belumLengkap}</td>
                  </tr>
                ))}
                <tr className="bg-slate-50 dark:bg-slate-700/40 font-semibold">
                  <td className="px-4 py-3 text-slate-800 dark:text-slate-200">Total</td>
                  <td className="px-4 py-3 text-center text-slate-800 dark:text-slate-200">{total}</td>
                  <td className="px-4 py-3">
                    <Bar nilai={persen(hobi, total)} />
                  </td>
                  <td className="px-4 py-3">
                    <Bar nilai={persen(cita, total)} />
                  </td>
                  <td className="px-4 py-3" />
                </tr>
              </tbody>
            </table>
          </div>

          {kelasDipilih && (
            <div className="mt-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">
                Siswa {kelasDipilih} yang belum lengkap ({belumLengkap.length})
              </p>
              {belumLengkap.length === 0 ? (
                <p className="text-sm text-emerald-600 dark:text-emerald-400">Semua siswa sudah lengkap.</p>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-700/60 text-sm">
                  {belumLengkap.map((s) => (
                    <li key={s.id} className="py-2 flex items-center justify-between gap-3">
                      <span className="text-slate-800 dark:text-slate-200">{s.nama}</span>
                      <span className="text-xs text-amber-600 dark:text-amber-400">
                        Belum:{" "}
                        {[s.id_hobby == null ? "Hobi" : null, s.id_cita == null ? "Cita-cita" : null]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
