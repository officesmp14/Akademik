"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ChevronLeft, Loader2, LogOut } from "lucide-react";

type RiwayatMutasiRow = {
  id: string;
  tanggal_mutasi: string | null;
  alasan_mutasi: string | null;
  sekolah_tujuan: string | null;
  alamat_sekolah_tujuan: string | null;
  siswa01: { nama: string | null; nisn: string | null; rombel: string | null } | null;
};

function formatTanggal(tanggal: string | null) {
  if (!tanggal) return "-";
  return new Date(`${tanggal}T00:00:00`).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function RiwayatMutasiPage() {
  const [rows, setRows] = useState<RiwayatMutasiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from("siswa_mutasi_keluar")
        .select(
          "id, tanggal_mutasi, alasan_mutasi, sekolah_tujuan, alamat_sekolah_tujuan, siswa01(nama, nisn, rombel)"
        )
        .order("tanggal_mutasi", { ascending: false });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      setRows((data ?? []) as unknown as RiwayatMutasiRow[]);
      setLoading(false);
    }
    fetchData();
  }, []);

  return (
    <div className="p-6 md:p-8">
      <a
        href="/laporan"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4"
      >
        <ChevronLeft className="h-4 w-4" />
        Kembali ke Laporan
      </a>

      <h1 className="text-2xl font-semibold text-slate-900 mb-1">Riwayat Siswa Mutasi Keluar</h1>
      <p className="text-sm text-slate-500 mb-6">
        Daftar siswa yang tercatat mutasi keluar beserta sekolah & alasan tujuannya
      </p>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">
          {error}
        </p>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
              <th className="px-4 py-3 font-medium w-12">No</th>
              <th className="px-4 py-3 font-medium">Nama</th>
              <th className="px-4 py-3 font-medium">NISN</th>
              <th className="px-4 py-3 font-medium">Rombel Terakhir</th>
              <th className="px-4 py-3 font-medium">Tanggal Mutasi</th>
              <th className="px-4 py-3 font-medium">Sekolah Tujuan</th>
              <th className="px-4 py-3 font-medium">Alamat Sekolah Tujuan</th>
              <th className="px-4 py-3 font-medium">Alasan Mutasi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                  <LogOut className="h-6 w-6 mx-auto mb-2 text-slate-300" />
                  Belum ada riwayat siswa mutasi keluar.
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr key={row.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                  <td className="px-4 py-3 text-slate-500">{idx + 1}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{row.siswa01?.nama || "-"}</td>
                  <td className="px-4 py-3 text-slate-600">{row.siswa01?.nisn || "-"}</td>
                  <td className="px-4 py-3 text-slate-600">{row.siswa01?.rombel || "-"}</td>
                  <td className="px-4 py-3 text-slate-600">{formatTanggal(row.tanggal_mutasi)}</td>
                  <td className="px-4 py-3 text-slate-600">{row.sekolah_tujuan || "-"}</td>
                  <td className="px-4 py-3 text-slate-600">{row.alamat_sekolah_tujuan || "-"}</td>
                  <td className="px-4 py-3 text-slate-600">{row.alasan_mutasi || "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
