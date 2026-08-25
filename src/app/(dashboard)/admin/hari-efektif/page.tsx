"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getTahunAjaranSaatIni } from "@/types/nilai";
import { BULAN_GANJIL, BULAN_GENAP, HariEfektifBulanan, Semester } from "@/types/hari-efektif";
import { Loader2, Check } from "lucide-react";

export default function HariEfektifPage() {
  const [tahunAjaran, setTahunAjaran] = useState(getTahunAjaranSaatIni());
  const [jumlah, setJumlah] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!tahunAjaran) return;
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("hari_efektif_bulanan")
      .select("*")
      .eq("tahun_ajaran", tahunAjaran);

    if (error) {
      setError(error.message);
    } else {
      const map: Record<string, number> = {};
      for (const row of (data ?? []) as HariEfektifBulanan[]) {
        map[row.bulan] = row.jumlah_hari;
      }
      setJumlah(map);
    }
    setLoading(false);
  }, [tahunAjaran]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function updateBulan(bulan: string, value: number) {
    setJumlah((prev) => ({ ...prev, [bulan]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);

    const supabase = createClient();
    const rows = [...BULAN_GANJIL, ...BULAN_GENAP].map((bulan) => ({
      tahun_ajaran: tahunAjaran,
      semester: (BULAN_GANJIL.includes(bulan) ? "Ganjil" : "Genap") as Semester,
      bulan,
      jumlah_hari: jumlah[bulan] ?? 0,
    }));

    const { error } = await supabase
      .from("hari_efektif_bulanan")
      .upsert(rows, { onConflict: "tahun_ajaran,bulan" });

    setSaving(false);

    if (error) {
      setError(error.message);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  const totalGanjil = BULAN_GANJIL.reduce((acc, b) => acc + (jumlah[b] ?? 0), 0);
  const totalGenap = BULAN_GENAP.reduce((acc, b) => acc + (jumlah[b] ?? 0), 0);

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto dark:bg-slate-900 min-h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Hari Efektif per Bulan
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Jumlah hari efektif belajar tiap bulan, dicatat per tahun ajaran
        </p>
      </div>

      <div className="mb-5">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
          Tahun Ajaran
        </label>
        <input
          value={tahunAjaran}
          onChange={(e) => setTahunAjaran(e.target.value)}
          placeholder="2026/2027"
          className="w-full sm:w-52 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Semester Ganjil</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">Total: {totalGanjil} hari</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {BULAN_GANJIL.map((bulan) => (
                <div key={bulan}>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    {bulan}
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={31}
                    value={jumlah[bulan] ?? 0}
                    onChange={(e) => updateBulan(bulan, Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-700/60 pt-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Semester Genap</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">Total: {totalGenap} hari</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {BULAN_GENAP.map((bulan) => (
                <div key={bulan}>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    {bulan}
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={31}
                    value={jumlah[bulan] ?? 0}
                    onChange={(e) => updateBulan(bulan, Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white text-sm font-medium px-5 py-2.5 hover:bg-indigo-700 disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saved && <Check className="h-4 w-4" />}
              Simpan
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
