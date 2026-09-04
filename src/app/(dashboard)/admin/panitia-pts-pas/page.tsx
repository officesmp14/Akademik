"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getTahunAjaranSaatIni, getSemesterSaatIni } from "@/types/nilai";
import { JenisPanitia, PanitiaPtsPas } from "@/types/panitia";
import { Loader2, Check } from "lucide-react";

type GtkOption = { id: string; nama: string | null; nip: string | null };

type FormPerJenis = { ketua_gtk_id: string; sekretaris_gtk_id: string };

const JENIS_LIST: JenisPanitia[] = ["PTS", "PAS"];

function emptyForm(): Record<JenisPanitia, FormPerJenis> {
  return {
    PTS: { ketua_gtk_id: "", sekretaris_gtk_id: "" },
    PAS: { ketua_gtk_id: "", sekretaris_gtk_id: "" },
  };
}

export default function PanitiaPtsPasPage() {
  const [tahunAjaran, setTahunAjaran] = useState(getTahunAjaranSaatIni());
  const [semester, setSemester] = useState<"Ganjil" | "Genap">(getSemesterSaatIni());
  const [gtkOptions, setGtkOptions] = useState<GtkOption[]>([]);
  const [form, setForm] = useState<Record<JenisPanitia, FormPerJenis>>(emptyForm());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDefaultPeriode() {
      const supabase = createClient();
      const { data } = await supabase
        .from("pengaturan_akademik")
        .select("tahun_ajaran, semester")
        .eq("id", 1)
        .maybeSingle();
      if (data) {
        setTahunAjaran(data.tahun_ajaran);
        setSemester(data.semester);
      }
    }
    fetchDefaultPeriode();
  }, []);

  const fetchData = useCallback(async () => {
    if (!tahunAjaran) return;
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const [gtkRes, panitiaRes] = await Promise.all([
      supabase.from("datagtk").select("id, nama, nip").order("nama", { ascending: true }),
      supabase
        .from("panitia_pts_pas")
        .select("id, tahun_ajaran, semester, jenis, ketua_gtk_id, sekretaris_gtk_id")
        .eq("tahun_ajaran", tahunAjaran)
        .eq("semester", semester),
    ]);

    if (panitiaRes.error) {
      setError(panitiaRes.error.message);
      setLoading(false);
      return;
    }

    setGtkOptions(gtkRes.data ?? []);

    const next = emptyForm();
    for (const row of (panitiaRes.data ?? []) as PanitiaPtsPas[]) {
      next[row.jenis] = {
        ketua_gtk_id: row.ketua_gtk_id ?? "",
        sekretaris_gtk_id: row.sekretaris_gtk_id ?? "",
      };
    }
    setForm(next);
    setLoading(false);
  }, [tahunAjaran, semester]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function updateField(jenis: JenisPanitia, key: keyof FormPerJenis, value: string) {
    setForm((f) => ({ ...f, [jenis]: { ...f[jenis], [key]: value } }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);
    const supabase = createClient();

    const payload = JENIS_LIST.map((jenis) => ({
      tahun_ajaran: tahunAjaran,
      semester,
      jenis,
      ketua_gtk_id: form[jenis].ketua_gtk_id || null,
      sekretaris_gtk_id: form[jenis].sekretaris_gtk_id || null,
    }));

    const { error } = await supabase
      .from("panitia_pts_pas")
      .upsert(payload, { onConflict: "tahun_ajaran,semester,jenis" });

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
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Panitia PTS &amp; PAS</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Tentukan ketua panitia dan sekretaris untuk Penilaian Tengah Semester (PTS) dan Penilaian
          Akhir Semester (PAS), per tahun ajaran &amp; semester
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <select
          value={semester}
          onChange={(e) => setSemester(e.target.value as "Ganjil" | "Genap")}
          className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="Ganjil">Semester Ganjil</option>
          <option value="Genap">Semester Genap</option>
        </select>

        <input
          value={tahunAjaran}
          onChange={(e) => setTahunAjaran(e.target.value)}
          className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm w-32 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="2026/2027"
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
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 space-y-6">
          {JENIS_LIST.map((jenis) => (
            <div key={jenis} className={jenis === "PAS" ? "border-t border-slate-100 dark:border-slate-700/60 pt-5" : ""}>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">
                {jenis === "PTS" ? "Penilaian Tengah Semester (PTS)" : "Penilaian Akhir Semester (PAS)"}
              </p>
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                    Ketua Panitia
                  </label>
                  <select
                    value={form[jenis].ketua_gtk_id}
                    onChange={(e) => updateField(jenis, "ketua_gtk_id", e.target.value)}
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
                    value={form[jenis].sekretaris_gtk_id}
                    onChange={(e) => updateField(jenis, "sekretaris_gtk_id", e.target.value)}
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
            </div>
          ))}

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
