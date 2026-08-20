"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  PengaturanAkademik,
  getTahunAjaranSaatIni,
  getSemesterSaatIni,
} from "@/types/nilai";
import { Loader2, Check } from "lucide-react";

export default function PengaturanAkademikPage() {
  const [form, setForm] = useState<PengaturanAkademik>({
    id: 1,
    tahun_ajaran: getTahunAjaranSaatIni(),
    semester: getSemesterSaatIni(),
    tanggal_bagi_rapor_sts_ganjil: null,
    tanggal_bagi_rapor_sts_genap: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("pengaturan_akademik")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      setError(error.message);
    } else if (data) {
      setForm(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function updateField<K extends keyof PengaturanAkademik>(key: K, value: PengaturanAkademik[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.from("pengaturan_akademik").upsert({ ...form, id: 1 });

    setSaving(false);

    if (error) {
      setError(error.message);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-3xl mx-auto flex justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Pengaturan Akademik</h1>
        <p className="text-sm text-slate-500 mt-1">
          Tahun ajaran & semester aktif ini jadi nilai default di seluruh aplikasi (Input Nilai,
          laporan, dst) — cukup ubah di sini setiap masuk periode baru
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="grid sm:grid-cols-2 gap-5 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Tahun Ajaran Aktif
            </label>
            <input
              value={form.tahun_ajaran}
              onChange={(e) => updateField("tahun_ajaran", e.target.value)}
              placeholder="2026/2027"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-xs text-slate-400 mt-1">
              Default hari ini: {getTahunAjaranSaatIni()}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Semester Aktif
            </label>
            <select
              value={form.semester}
              onChange={(e) => updateField("semester", e.target.value as "Ganjil" | "Genap")}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="Ganjil">Ganjil</option>
              <option value="Genap">Genap</option>
            </select>
            <p className="text-xs text-slate-400 mt-1">
              Default hari ini: {getSemesterSaatIni()}
            </p>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-5">
          <p className="text-sm font-semibold text-slate-800 mb-4">
            Tanggal Bagi Rapor Sisipan (STS)
          </p>
          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Semester Ganjil
              </label>
              <input
                type="date"
                value={form.tanggal_bagi_rapor_sts_ganjil ?? ""}
                onChange={(e) =>
                  updateField("tanggal_bagi_rapor_sts_ganjil", e.target.value || null)
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Semester Genap
              </label>
              <input
                type="date"
                value={form.tanggal_bagi_rapor_sts_genap ?? ""}
                onChange={(e) =>
                  updateField("tanggal_bagi_rapor_sts_genap", e.target.value || null)
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
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
    </div>
  );
}
