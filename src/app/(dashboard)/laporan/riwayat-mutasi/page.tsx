"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRole } from "@/lib/role-context";
import { ChevronLeft, Loader2, LogOut, Trash2, ExternalLink } from "lucide-react";

type RiwayatMutasiRow = {
  id: string;
  siswa_id: string;
  tanggal_mutasi: string | null;
  alasan_mutasi: string | null;
  sekolah_tujuan: string | null;
  alamat_sekolah_tujuan: string | null;
  link_dokumen: string | null;
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
  const { role } = useRole();
  const isFullAccessRole = role === "admin" || role === "kepala_sekolah";

  const [rows, setRows] = useState<RiwayatMutasiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<RiwayatMutasiRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function fetchData() {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("siswa_mutasi_keluar")
      .select(
        "id, siswa_id, tanggal_mutasi, alasan_mutasi, sekolah_tujuan, alamat_sekolah_tujuan, link_dokumen, siswa01(nama, nisn, rombel)"
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

  useEffect(() => {
    fetchData();
  }, []);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setActionError(null);
    const supabase = createClient();

    const { error: deleteError } = await supabase
      .from("siswa_mutasi_keluar")
      .delete()
      .eq("id", deleteTarget.id);

    if (deleteError) {
      setDeleting(false);
      setActionError(deleteError.message);
      return;
    }

    // Kembalikan status siswa ke Aktif -- kalau tidak, siswa akan tetap
    // berstatus "Mutasi" tanpa ada riwayat yang menjelaskan alasannya.
    const { error: statusError } = await supabase
      .from("siswa01")
      .update({ status_siswa: "Aktif" })
      .eq("id", deleteTarget.siswa_id);

    setDeleting(false);

    if (statusError) {
      setActionError(
        `Riwayat berhasil dihapus, tapi gagal mengembalikan status siswa ke Aktif: ${statusError.message}`
      );
      return;
    }

    setDeleteTarget(null);
    fetchData();
  }

  return (
    <div className="p-6 md:p-8">
      <a
        href="/laporan"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 mb-4"
      >
        <ChevronLeft className="h-4 w-4" />
        Kembali ke Laporan
      </a>

      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-1">Riwayat Siswa Mutasi Keluar</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
        Daftar siswa yang tercatat mutasi keluar beserta sekolah & alasan tujuannya
      </p>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg px-3 py-2 mb-4">
          {error}
        </p>
      )}

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40 text-left text-slate-500 dark:text-slate-400">
              <th className="px-4 py-3 font-medium w-12">No</th>
              <th className="px-4 py-3 font-medium">Nama</th>
              <th className="px-4 py-3 font-medium">NISN</th>
              <th className="px-4 py-3 font-medium">Rombel Terakhir</th>
              <th className="px-4 py-3 font-medium">Tanggal Mutasi</th>
              <th className="px-4 py-3 font-medium">Sekolah Tujuan</th>
              <th className="px-4 py-3 font-medium">Alamat Sekolah Tujuan</th>
              <th className="px-4 py-3 font-medium">Alasan Mutasi</th>
              <th className="px-4 py-3 font-medium">Dokumen</th>
              {isFullAccessRole && <th className="px-4 py-3 font-medium text-right">Aksi</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={isFullAccessRole ? 10 : 9} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={isFullAccessRole ? 10 : 9} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500">
                  <LogOut className="h-6 w-6 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                  Belum ada riwayat siswa mutasi keluar.
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr key={row.id} className="border-b border-slate-100 dark:border-slate-700/60 last:border-0 hover:bg-slate-50/60 dark:hover:bg-slate-700/40">
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{idx + 1}</td>
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{row.siswa01?.nama || "-"}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{row.siswa01?.nisn || "-"}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{row.siswa01?.rombel || "-"}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{formatTanggal(row.tanggal_mutasi)}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{row.sekolah_tujuan || "-"}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{row.alamat_sekolah_tujuan || "-"}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{row.alasan_mutasi || "-"}</td>
                  <td className="px-4 py-3">
                    {row.link_dokumen ? (
                      <a
                        href={row.link_dokumen}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={row.link_dokumen}
                        className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Lihat
                      </a>
                    ) : (
                      <span className="text-slate-300 dark:text-slate-600">-</span>
                    )}
                  </td>
                  {isFullAccessRole && (
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end">
                        <button
                          onClick={() => {
                            setActionError(null);
                            setDeleteTarget(row);
                          }}
                          title="Hapus riwayat mutasi (kembalikan status siswa ke Aktif)"
                          className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1.5">
              Hapus riwayat mutasi ini?
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
              Riwayat mutasi keluar{" "}
              <span className="font-medium text-slate-700 dark:text-slate-200">
                {deleteTarget.siswa01?.nama}
              </span>{" "}
              akan dihapus permanen, dan status siswa ini akan dikembalikan menjadi{" "}
              <strong>Aktif</strong>.
            </p>
            {actionError && (
              <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg px-3 py-2 mb-4">
                {actionError}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 inline-flex items-center gap-2"
              >
                {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
