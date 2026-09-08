"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PanitiaHibot } from "@/types/panitia";
import { Loader2, Check } from "lucide-react";

type GtkOption = { id: string; nama: string | null; nip: string | null };

export default function PanitiaHibotPage() {
  const [gtkOptions, setGtkOptions] = useState<GtkOption[]>([]);
  const [ketuaGtkId, setKetuaGtkId] = useState("");
  const [sekretarisGtkId, setSekretarisGtkId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      const supabase = createClient();

      const [gtkRes, panitiaRes] = await Promise.all([
        supabase.from("datagtk").select("id, nama, nip").order("nama", { ascending: true }),
        supabase.from("panitia_hibot").select("id, ketua_gtk_id, sekretaris_gtk_id").eq("id", 1).maybeSingle(),
      ]);

      if (panitiaRes.error) {
        setError(panitiaRes.error.message);
        setLoading(false);
        return;
      }

      setGtkOptions(gtkRes.data ?? []);

      const row = panitiaRes.data as PanitiaHibot | null;
      setKetuaGtkId(row?.ketua_gtk_id ?? "");
      setSekretarisGtkId(row?.sekretaris_gtk_id ?? "");
      setLoading(false);
    }
    fetchData();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);
    const supabase = createClient();

    const { error } = await supabase.from("panitia_hibot").upsert({
      id: 1,
      ketua_gtk_id: ketuaGtkId || null,
      sekretaris_gtk_id: sekretarisGtkId || null,
    });

    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto dark:bg-slate-900 min-h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Panitia Hibot</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Tentukan ketua panitia dan sekretaris Hibot. Keduanya otomatis bisa membuka laporan Ganak
          Hibot.
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
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 space-y-6">
          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                Ketua Panitia
              </label>
              <select
                value={ketuaGtkId}
                onChange={(e) => setKetuaGtkId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- Belum ditentukan --</option>
                {gtkOptions.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nama} {g.nip ? `(NIP: ${g.nip})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                Sekretaris
              </label>
              <select
                value={sekretarisGtkId}
                onChange={(e) => setSekretarisGtkId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- Belum ditentukan --</option>
                {gtkOptions.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nama} {g.nip ? `(NIP: ${g.nip})` : ""}
                  </option>
                ))}
              </select>
            </div>
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
