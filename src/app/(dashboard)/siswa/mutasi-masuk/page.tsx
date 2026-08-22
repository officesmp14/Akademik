"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useModulePermission } from "@/lib/role-context";
import {
  DOKUMEN_MUTASI_MASUK_FIELDS,
  MUTASI_MASUK_STORAGE_BUCKET,
  SiswaMutasiMasuk,
} from "@/types/mutasi-masuk";
import {
  Plus,
  Loader2,
  FileText,
  Check,
  X,
  Trash2,
  ExternalLink,
  UserPlus,
  Pencil,
} from "lucide-react";

const STATUS_STYLE: Record<string, string> = {
  Diajukan: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400",
  Diterima: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  Ditolak: "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400",
};

export default function MutasiMasukPage() {
  const { canEdit } = useModulePermission("siswa");

  const [rows, setRows] = useState<SiswaMutasiMasuk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [docTarget, setDocTarget] = useState<SiswaMutasiMasuk | null>(null);
  const [rejectTarget, setRejectTarget] = useState<SiswaMutasiMasuk | null>(null);
  const [acceptTarget, setAcceptTarget] = useState<SiswaMutasiMasuk | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SiswaMutasiMasuk | null>(null);
  const [keterangan, setKeterangan] = useState("");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("siswa_mutasi_masuk")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setRows((data ?? []) as SiswaMutasiMasuk[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  async function openDocument(path: string) {
    const supabase = createClient();
    const { data, error } = await supabase.storage
      .from(MUTASI_MASUK_STORAGE_BUCKET)
      .createSignedUrl(path, 60);

    if (error || !data) {
      setActionError(error?.message ?? "Gagal membuka dokumen.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function handleAccept() {
    if (!acceptTarget) return;
    setSaving(true);
    setActionError(null);
    const supabase = createClient();

    const { data: siswaBaru, error: insertError } = await supabase
      .from("siswa01")
      .insert({
        nama: acceptTarget.nama_siswa,
        nisn: acceptTarget.nisn,
        rombel: acceptTarget.kelas_tujuan,
        sekolah_asal: acceptTarget.asal_nama_sekolah,
        jalur: "Perpindahan",
        status_siswa: "Aktif",
      })
      .select("id")
      .single();

    if (insertError) {
      setSaving(false);
      setActionError("Gagal membuat data siswa: " + insertError.message);
      return;
    }

    const { error: updateError } = await supabase
      .from("siswa_mutasi_masuk")
      .update({ status: "Diterima", siswa_id: siswaBaru.id, keterangan: keterangan.trim() || null })
      .eq("id", acceptTarget.id);

    setSaving(false);

    if (updateError) {
      setActionError("Data siswa dibuat, tapi status pengajuan gagal diperbarui: " + updateError.message);
      return;
    }

    setAcceptTarget(null);
    setKeterangan("");
    fetchAll();
  }

  async function handleReject() {
    if (!rejectTarget) return;
    setSaving(true);
    setActionError(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("siswa_mutasi_masuk")
      .update({ status: "Ditolak", keterangan: keterangan.trim() || null })
      .eq("id", rejectTarget.id);
    setSaving(false);

    if (error) {
      setActionError(error.message);
      return;
    }
    setRejectTarget(null);
    setKeterangan("");
    fetchAll();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setSaving(true);
    setActionError(null);
    const supabase = createClient();

    const paths = DOKUMEN_MUTASI_MASUK_FIELDS.map((f) => deleteTarget[f.key]).filter(
      (p): p is string => Boolean(p)
    );
    if (paths.length > 0) {
      await supabase.storage.from(MUTASI_MASUK_STORAGE_BUCKET).remove(paths);
    }

    const { error } = await supabase.from("siswa_mutasi_masuk").delete().eq("id", deleteTarget.id);
    setSaving(false);

    if (error) {
      setActionError(error.message);
      return;
    }
    setDeleteTarget(null);
    fetchAll();
  }

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Siswa Mutasi Masuk</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Pengajuan siswa pindahan dari sekolah lain beserta dokumen pendukungnya
          </p>
        </div>
        {canEdit && (
          <Link
            href="/siswa/mutasi-masuk/tambah"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white text-sm font-medium px-4 py-2 hover:bg-indigo-700 shrink-0"
          >
            <Plus className="h-4 w-4" />
            Tambah Pengajuan
          </Link>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg px-3 py-2 mb-4">
          {error}
        </p>
      )}
      {actionError && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg px-3 py-2 mb-4">
          {actionError}
        </p>
      )}

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40 text-left text-slate-500 dark:text-slate-400">
              <th className="px-4 py-3 font-medium w-12">No</th>
              <th className="px-4 py-3 font-medium">Nama Siswa</th>
              <th className="px-4 py-3 font-medium">NISN</th>
              <th className="px-4 py-3 font-medium">Sekolah Asal</th>
              <th className="px-4 py-3 font-medium">Kelas Tujuan</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Keterangan</th>
              <th className="px-4 py-3 font-medium">Dokumen</th>
              {canEdit && <th className="px-4 py-3 font-medium text-right">Aksi</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={canEdit ? 9 : 8} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={canEdit ? 9 : 8} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500">
                  <UserPlus className="h-6 w-6 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                  Belum ada pengajuan siswa mutasi masuk.
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr key={row.id} className="border-b border-slate-100 dark:border-slate-700/60 last:border-0 hover:bg-slate-50/60 dark:hover:bg-slate-700/60">
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{idx + 1}</td>
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{row.nama_siswa}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{row.nisn || "-"}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{row.asal_nama_sekolah || "-"}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{row.kelas_tujuan || "-"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        STATUS_STYLE[row.status] ?? "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300 max-w-xs truncate" title={row.keterangan || ""}>
                    {row.keterangan || "-"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setDocTarget(row)}
                      className="inline-flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 text-sm font-medium"
                    >
                      <FileText className="h-4 w-4" />
                      Lihat
                    </button>
                  </td>
                  {canEdit && (
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/siswa/mutasi-masuk/${row.id}`}
                          title="Ubah"
                          className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                        {row.status === "Diajukan" && (
                          <>
                            <button
                              onClick={() => {
                                setKeterangan("");
                                setActionError(null);
                                setAcceptTarget(row);
                              }}
                              title="Terima"
                              className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                setKeterangan("");
                                setActionError(null);
                                setRejectTarget(row);
                              }}
                              title="Tolak"
                              className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => setDeleteTarget(row)}
                          title="Hapus"
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

      {/* Modal: lihat dokumen */}
      {docTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-sm w-full shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">Dokumen {docTarget.nama_siswa}</h3>
              <button onClick={() => setDocTarget(null)}>
                <X className="h-4 w-4 text-slate-400 dark:text-slate-500" />
              </button>
            </div>
            <div className="space-y-2">
              {DOKUMEN_MUTASI_MASUK_FIELDS.map(({ key, label }) => {
                const path = docTarget[key];
                return (
                  <div
                    key={key}
                    className="flex items-center justify-between gap-3 text-sm border border-slate-100 dark:border-slate-700/60 rounded-lg px-3 py-2"
                  >
                    <span className="text-slate-700 dark:text-slate-200">{label}</span>
                    {path ? (
                      <button
                        onClick={() => openDocument(path)}
                        className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium shrink-0"
                      >
                        Buka <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500 shrink-0">Belum diupload</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal: terima */}
      {acceptTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1.5">Terima siswa ini?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
              Data siswa baru akan otomatis dibuat di Data Siswa: nama{" "}
              <span className="font-medium text-slate-700 dark:text-slate-200">{acceptTarget.nama_siswa}</span>, rombel{" "}
              <span className="font-medium text-slate-700 dark:text-slate-200">{acceptTarget.kelas_tujuan || "-"}</span>,
              status Aktif.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                Alasan Diterima (opsional)
              </label>
              <textarea
                rows={3}
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                placeholder="mis. Sesuai domisili, kuota kelas tersedia..."
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            {actionError && (
              <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg px-3 py-2 mb-4">
                {actionError}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setAcceptTarget(null);
                  setKeterangan("");
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                Batal
              </button>
              <button
                onClick={handleAccept}
                disabled={saving}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 inline-flex items-center gap-2"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Terima & Buat Data Siswa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: tolak */}
      {rejectTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1.5">Tolak pengajuan ini?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
              Pengajuan <span className="font-medium text-slate-700 dark:text-slate-200">{rejectTarget.nama_siswa}</span>{" "}
              akan ditandai Ditolak. Data siswa tidak akan dibuat.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                Alasan Ditolak
              </label>
              <textarea
                rows={3}
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                placeholder="mis. Dokumen tidak lengkap, kuota kelas penuh..."
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            {actionError && (
              <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg px-3 py-2 mb-4">
                {actionError}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setRejectTarget(null);
                  setKeterangan("");
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                Batal
              </button>
              <button
                onClick={handleReject}
                disabled={saving}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-60 inline-flex items-center gap-2"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Tolak
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: hapus */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1.5">Hapus pengajuan ini?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
              Pengajuan <span className="font-medium text-slate-700 dark:text-slate-200">{deleteTarget.nama_siswa}</span>{" "}
              beserta dokumennya akan dihapus permanen.
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
                disabled={saving}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 inline-flex items-center gap-2"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
