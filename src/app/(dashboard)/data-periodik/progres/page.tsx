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
  tinggi_badan: string | null;
  berat_badan: string | null;
  lingkar_kepala: string | null;
  jml_saudara: string | null;
  jarak_tempuh: string | null;
  jarak_tempuh_jam: string | null;
};

const terisi = (v: string | null) => v != null && String(v).trim() !== "";

// Kolom yang dipantau. Waktu tempuh dianggap terisi kalau JAM atau MENIT
// salah satunya terisi (jam kosong tapi menit ada = sudah diinput).
const KOLOM: { key: string; label: string; isi: (s: SiswaRow) => boolean }[] = [
  { key: "tinggi", label: "Tinggi", isi: (s) => terisi(s.tinggi_badan) },
  { key: "berat", label: "Berat", isi: (s) => terisi(s.berat_badan) },
  { key: "lingkar", label: "Lingkar Kepala", isi: (s) => terisi(s.lingkar_kepala) },
  { key: "saudara", label: "Saudara", isi: (s) => terisi(s.jml_saudara) },
  { key: "waktu", label: "Waktu Tempuh (Jam/Menit)", isi: (s) => terisi(s.jarak_tempuh_jam) || terisi(s.jarak_tempuh) },
];

function persen(bagian: number, total: number): number {
  return total === 0 ? 0 : Math.round((bagian / total) * 1000) / 10;
}

function Bar({ nilai }: { nilai: number }) {
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
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

export default function ProgresDataPeriodikPage() {
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
        .select("id, nama, rombel, tinggi_badan, berat_badan, lingkar_kepala, jml_saudara, jarak_tempuh, jarak_tempuh_jam")
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

  const kelasList = Array.from(new Set(siswa.map((s) => s.rombel || "Tanpa Rombel"))).sort(compareKelas);
  const total = siswa.length;
  const belumLengkap = (s: SiswaRow) => KOLOM.filter((k) => !k.isi(s));

  const siswaKelasDipilih = kelasDipilih
    ? siswa.filter((s) => (s.rombel || "Tanpa Rombel") === kelasDipilih && belumLengkap(s).length > 0)
    : [];

  return (
    <div className="p-6 md:p-8">
      <Link
        href="/data-periodik"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 mb-4"
      >
        <ChevronLeft className="h-4 w-4" />
        Kembali ke Data Periodik
      </Link>

      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Progres Data Periodik</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-6">
        Persentase siswa aktif yang sudah diisi Tinggi, Berat, Lingkar Kepala, Saudara, dan Waktu Tempuh di Data
        Periodik. Waktu Tempuh dianggap terisi jika Jam <em>atau</em> Menit diisi.
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
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            {KOLOM.map((k) => {
              const isi = siswa.filter(k.isi).length;
              return (
                <div
                  key={k.key}
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4"
                >
                  <p className="text-xs text-slate-500 dark:text-slate-400">{k.label}</p>
                  <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mt-1">
                    {persen(isi, total)}%
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {isi} dari {total} siswa
                  </p>
                </div>
              );
            })}
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40 text-left text-slate-500 dark:text-slate-400">
                  <th className="px-4 py-3 font-medium">Kelas</th>
                  <th className="px-4 py-3 font-medium text-center">Jumlah Siswa</th>
                  {KOLOM.map((k) => (
                    <th key={k.key} className="px-4 py-3 font-medium">
                      {k.label}
                    </th>
                  ))}
                  <th className="px-4 py-3 font-medium text-center">Belum Lengkap</th>
                </tr>
              </thead>
              <tbody>
                {kelasList.map((kelas) => {
                  const anggota = siswa.filter((s) => (s.rombel || "Tanpa Rombel") === kelas);
                  return (
                    <tr
                      key={kelas}
                      onClick={() => setKelasDipilih((k) => (k === kelas ? null : kelas))}
                      className={`border-b border-slate-100 dark:border-slate-700/60 cursor-pointer hover:bg-slate-50/60 dark:hover:bg-slate-700 ${
                        kelasDipilih === kelas ? "bg-indigo-50/60 dark:bg-indigo-500/10" : ""
                      }`}
                    >
                      <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{kelas}</td>
                      <td className="px-4 py-3 text-center text-slate-700 dark:text-slate-200">{anggota.length}</td>
                      {KOLOM.map((k) => (
                        <td key={k.key} className="px-4 py-3">
                          <Bar nilai={persen(anggota.filter(k.isi).length, anggota.length)} />
                        </td>
                      ))}
                      <td className="px-4 py-3 text-center text-slate-700 dark:text-slate-200">
                        {anggota.filter((s) => belumLengkap(s).length > 0).length}
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-slate-50 dark:bg-slate-700/40 font-semibold">
                  <td className="px-4 py-3 text-slate-800 dark:text-slate-200">Total</td>
                  <td className="px-4 py-3 text-center text-slate-800 dark:text-slate-200">{total}</td>
                  {KOLOM.map((k) => (
                    <td key={k.key} className="px-4 py-3">
                      <Bar nilai={persen(siswa.filter(k.isi).length, total)} />
                    </td>
                  ))}
                  <td className="px-4 py-3 text-center text-slate-800 dark:text-slate-200">
                    {siswa.filter((s) => belumLengkap(s).length > 0).length}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {kelasDipilih && (
            <div className="mt-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">
                Siswa {kelasDipilih} yang belum lengkap ({siswaKelasDipilih.length})
              </p>
              {siswaKelasDipilih.length === 0 ? (
                <p className="text-sm text-emerald-600 dark:text-emerald-400">Semua siswa sudah lengkap.</p>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-700/60 text-sm">
                  {siswaKelasDipilih.map((s) => (
                    <li key={s.id} className="py-2 flex items-center justify-between gap-3">
                      <span className="text-slate-800 dark:text-slate-200">{s.nama}</span>
                      <span className="text-xs text-amber-600 dark:text-amber-400 text-right">
                        Belum: {belumLengkap(s).map((k) => k.label).join(", ")}
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
