"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRole } from "@/lib/role-context";
import { ChevronLeft, Loader2, MapPin } from "lucide-react";

type Kecamatan = { kode: string; nama: string };
type Kelurahan = { id: string; kecamatan_kode: string; nama: string; kode: string | null };

export default function ReferensiKecamatanPage() {
  const { role } = useRole();
  const canEdit = role === "admin" || role === "kepala_sekolah";

  const [kecamatan, setKecamatan] = useState<Kecamatan[]>([]);
  const [kelurahan, setKelurahan] = useState<Kelurahan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const [kecRes, kelRes] = await Promise.all([
      supabase.from("ref_kecamatan").select("kode, nama").order("kode"),
      supabase.from("ref_kelurahan").select("id, kecamatan_kode, nama, kode").order("nama"),
    ]);
    const err = kecRes.error ?? kelRes.error;
    if (err) {
      setError(
        err.message.includes("does not exist") || err.code === "42P01"
          ? "Tabel belum ada -- jalankan supabase/ref-wilayah-tarakan.sql di Supabase SQL Editor."
          : err.message
      );
      setLoading(false);
      return;
    }
    setKecamatan((kecRes.data ?? []) as Kecamatan[]);
    setKelurahan((kelRes.data ?? []) as Kelurahan[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function simpanKodeKelurahan(row: Kelurahan, kode: string | null) {
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase.from("ref_kelurahan").update({ kode }).eq("id", row.id).select("id");
    if (error) {
      setError(error.message);
      return;
    }
    if (!data || data.length === 0) {
      setError("Tidak ada baris yang tersimpan -- akun ini belum punya izin ubah.");
      return;
    }
    setKelurahan((prev) => prev.map((k) => (k.id === row.id ? { ...k, kode } : k)));
  }

  return (
    <div className="p-6 md:p-8">
      <Link
        href="/referensi"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 mb-4"
      >
        <ChevronLeft className="h-4 w-4" />
        Kembali ke Referensi
      </Link>

      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Referensi Kecamatan</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-6">
        Kecamatan dan kelurahan di Kota Tarakan beserta kode Kemendagri. Kode kelurahan diisi manual
        {canEdit ? " (ketik di kolomnya, tersimpan saat keluar dari kotak)." : "."}
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
        <div className="grid lg:grid-cols-2 gap-4">
          {kecamatan.map((kec) => {
            const daftar = kelurahan.filter((k) => k.kecamatan_kode === kec.kode);
            return (
              <div
                key={kec.kode}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden"
              >
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40">
                  <p className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    {kec.nama}
                  </p>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Kode {kec.kode} · {daftar.length} kelurahan
                  </span>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700/60">
                      <th className="px-5 py-2 font-medium">Kelurahan</th>
                      <th className="px-5 py-2 font-medium w-48">Kode Kelurahan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {daftar.map((k) => (
                      <tr key={k.id} className="border-b border-slate-100 dark:border-slate-700/60 last:border-0">
                        <td className="px-5 py-2 text-slate-800 dark:text-slate-200">{k.nama}</td>
                        <td className="px-5 py-2">
                          <input
                            key={`${k.id}-${k.kode ?? ""}`}
                            defaultValue={k.kode ?? ""}
                            disabled={!canEdit}
                            placeholder="-"
                            onBlur={(e) => {
                              const v = e.target.value.trim() || null;
                              if (v !== (k.kode ?? null)) simpanKodeKelurahan(k, v);
                            }}
                            className="w-40 rounded border border-slate-300 dark:border-slate-600 px-2 py-1 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100 dark:disabled:bg-slate-800"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
