"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Check } from "lucide-react";

type PengaturanSkl = {
  id: number;
  bobot_rapor: number;
  bobot_ujian_sekolah: number;
  tanggal_cetak_skl: string | null;
};

export default function PengaturanSklPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({ bobot_rapor: 70, bobot_ujian_sekolah: 30, tanggal_cetak_skl: "" });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("pengaturan_skl")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    if (data) {
      const row = data as PengaturanSkl;
      setForm({
        bobot_rapor: row.bobot_rapor,
        bobot_ujian_sekolah: row.bobot_ujian_sekolah,
        tanggal_cetak_skl: row.tanggal_cetak_skl ?? "",
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const total = form.bobot_rapor + form.bobot_ujian_sekolah;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);
    const supabase = createClient();

    const { error: err } = await supabase.from("pengaturan_skl").upsert({
      id: 1,
      ...form,
      tanggal_cetak_skl: form.tanggal_cetak_skl || null,
    });

    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto dark:bg-slate-900 min-h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Pengaturan SKL</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Bobot komponen nilai akhir SKL (Surat Keterangan Lulus)
        </p>
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
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 space-y-5"
        >
          <div className="flex items-center justify-between gap-4">
            <label className="text-sm text-slate-700 dark:text-slate-200">
              Nilai Raport Kelas 7, 8, 9 (6 Semester)
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={0}
                max={100}
                value={form.bobot_rapor}
                onChange={(e) => setForm((p) => ({ ...p, bobot_rapor: Number(e.target.value) }))}
                className="w-24 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm text-center bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-sm text-slate-500 dark:text-slate-400">%</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <label className="text-sm text-slate-700 dark:text-slate-200">
              Nilai Ujian Sekolah (Tertulis + Praktik)
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={0}
                max={100}
                value={form.bobot_ujian_sekolah}
                onChange={(e) =>
                  setForm((p) => ({ ...p, bobot_ujian_sekolah: Number(e.target.value) }))
                }
                className="w-24 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm text-center bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-sm text-slate-500 dark:text-slate-400">%</span>
            </div>
          </div>

          <p
            className={`text-xs pt-1 border-t border-slate-100 dark:border-slate-700/60 ${
              total === 100
                ? "text-slate-400 dark:text-slate-500"
                : "text-amber-600 dark:text-amber-400"
            }`}
          >
            Total bobot: {total}% {total !== 100 && "-- idealnya total 100%"}
          </p>

          <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-100 dark:border-slate-700/60">
            <label className="text-sm text-slate-700 dark:text-slate-200">Tanggal Cetak SKL</label>
            <input
              type="date"
              value={form.tanggal_cetak_skl}
              onChange={(e) => setForm((p) => ({ ...p, tanggal_cetak_skl: e.target.value }))}
              className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white text-sm font-medium px-5 py-2.5 hover:bg-indigo-700 disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saved && <Check className="h-4 w-4" />}
              Simpan
            </button>
            {saved && <span className="text-sm text-emerald-600 dark:text-emerald-400">Tersimpan.</span>}
          </div>
        </form>
      )}
    </div>
  );
}
