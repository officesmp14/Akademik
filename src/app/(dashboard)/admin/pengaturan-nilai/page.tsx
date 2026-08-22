"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PengaturanNilaiMapel, PengaturanBobotNilai, Pelajaran } from "@/types/nilai";
import { Loader2, Check, Trash2 } from "lucide-react";

export default function PengaturanNilaiPage() {
  const [pelajaranList, setPelajaranList] = useState<Pelajaran[]>([]);
  const [kkbList, setKkbList] = useState<PengaturanNilaiMapel[]>([]);
  const [bobot, setBobot] = useState<PengaturanBobotNilai | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [kkbValues, setKkbValues] = useState<Record<number, string>>({});
  const [savingMapelId, setSavingMapelId] = useState<number | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const [formBobot, setFormBobot] = useState({ bobot_formatif: 1, bobot_sumatif_materi: 2, bobot_sa: 2 });
  const [savingBobot, setSavingBobot] = useState(false);
  const [bobotSaved, setBobotSaved] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const [pelajaranRes, kkbRes, bobotRes] = await Promise.all([
      supabase.from("pelajaran").select("*").order("mapel", { ascending: true }),
      supabase.from("pengaturan_nilai_mapel").select("*"),
      supabase.from("pengaturan_bobot_nilai").select("*").eq("id", 1).maybeSingle(),
    ]);

    if (pelajaranRes.error) {
      setError(pelajaranRes.error.message);
      setLoading(false);
      return;
    }

    setPelajaranList(pelajaranRes.data ?? []);
    setKkbList(kkbRes.data ?? []);

    const kv: Record<number, string> = {};
    for (const row of kkbRes.data ?? []) {
      kv[row.mapel_id] = String(row.kkb);
    }
    setKkbValues(kv);

    if (bobotRes.data) {
      setBobot(bobotRes.data);
      setFormBobot({
        bobot_formatif: bobotRes.data.bobot_formatif,
        bobot_sumatif_materi: bobotRes.data.bobot_sumatif_materi,
        bobot_sa: bobotRes.data.bobot_sa,
      });
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const kkbMap = new Map(kkbList.map((k) => [k.mapel_id, k]));
  const totalBobot = formBobot.bobot_formatif + formBobot.bobot_sumatif_materi + formBobot.bobot_sa;

  async function saveBobot(e: React.FormEvent) {
    e.preventDefault();
    setSavingBobot(true);
    setBobotSaved(false);
    const supabase = createClient();
    const { error } = await supabase
      .from("pengaturan_bobot_nilai")
      .upsert({ id: 1, ...formBobot });
    setSavingBobot(false);
    if (!error) {
      setBobotSaved(true);
      setTimeout(() => setBobotSaved(false), 2000);
      fetchAll();
    } else {
      setError(error.message);
    }
  }

  async function saveKkb(mapelId: number, rawValue: string) {
    if (rawValue.trim() === "") return;
    const kkb = Number(rawValue);
    if (isNaN(kkb) || kkb < 0 || kkb > 100) {
      setError("KKB harus angka 0-100.");
      return;
    }

    setSavingMapelId(mapelId);
    const supabase = createClient();
    const existing = kkbMap.get(mapelId);

    const { data, error } = existing?.id
      ? await supabase
          .from("pengaturan_nilai_mapel")
          .update({ kkb })
          .eq("id", existing.id)
          .select()
          .single()
      : await supabase
          .from("pengaturan_nilai_mapel")
          .insert({ mapel_id: mapelId, kkb })
          .select()
          .single();

    setSavingMapelId(null);

    if (error) {
      setError(error.message);
      return;
    }

    // Update state lokal saja -- tidak perlu reload semua data (biar tidak "berkedip")
    setKkbList((prev) => {
      const next = prev.filter((k) => k.mapel_id !== mapelId);
      next.push(data);
      return next;
    });
  }

  function toggleSelect(mapelId: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(mapelId)) next.delete(mapelId);
      else next.add(mapelId);
      return next;
    });
  }

  async function handleDeleteSelected() {
    if (selected.size === 0) return;
    if (!window.confirm(`Hapus pengaturan KKB untuk ${selected.size} mapel terpilih?`)) return;

    const idsToDelete = [...selected]
      .map((mapelId) => kkbMap.get(mapelId)?.id)
      .filter((id): id is string => Boolean(id));

    if (idsToDelete.length === 0) {
      setSelected(new Set());
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.from("pengaturan_nilai_mapel").delete().in("id", idsToDelete);
    if (!error) {
      setSelected(new Set());
      fetchAll();
    } else {
      setError(error.message);
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto dark:bg-slate-900 min-h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Pengaturan Nilai</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Format Kurikulum Merdeka: Bobot berlaku untuk semua mapel, KKB (Kriteria Ketuntasan
          Belajar) diatur per mapel
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg px-3 py-2 mb-4">
          {error}
        </p>
      )}

      {/* Bobot Nilai Raport -- global */}
      <form
        onSubmit={saveBobot}
        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden mb-8"
      >
        <div className="bg-slate-700 text-white px-4 py-2.5">
          <p className="text-sm font-semibold">Bobot Nilai Raport</p>
        </div>
        <div className="p-5 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <label className="text-sm text-slate-700 dark:text-slate-200">Nilai Formatif (F)</label>
            <input
              type="number"
              value={formBobot.bobot_formatif}
              onChange={(e) =>
                setFormBobot((p) => ({ ...p, bobot_formatif: Number(e.target.value) }))
              }
              className="w-24 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <label className="text-sm text-slate-700 dark:text-slate-200">Nilai Sumatif Lingkup Materi (S)</label>
            <input
              type="number"
              value={formBobot.bobot_sumatif_materi}
              onChange={(e) =>
                setFormBobot((p) => ({ ...p, bobot_sumatif_materi: Number(e.target.value) }))
              }
              className="w-24 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <label className="text-sm text-slate-700 dark:text-slate-200">Nilai Sumatif Akhir Semester (SA)</label>
            <input
              type="number"
              value={formBobot.bobot_sa}
              onChange={(e) => setFormBobot((p) => ({ ...p, bobot_sa: Number(e.target.value) }))}
              className="w-24 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <p className="text-xs text-slate-400 dark:text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-700/60">
            Rumus Nilai Akhir Raport = ({formBobot.bobot_formatif} x F + {formBobot.bobot_sumatif_materi} x S +{" "}
            {formBobot.bobot_sa} x SA) / {totalBobot}
          </p>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={savingBobot}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white text-sm font-medium px-4 py-2 hover:bg-indigo-700 disabled:opacity-60"
            >
              {savingBobot && <Loader2 className="h-4 w-4 animate-spin" />}
              {bobotSaved && <Check className="h-4 w-4" />}
              Simpan Bobot
            </button>
          </div>
        </div>
      </form>

      {/* KKB per mapel */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">KKB per Mata Pelajaran</p>
          {selected.size > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 px-2 py-1 rounded-lg"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Hapus KKB Terpilih ({selected.size})
            </button>
          )}
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40 text-left text-slate-500 dark:text-slate-400">
              <th className="px-4 py-3 font-medium w-16 text-center">Checklist</th>
              <th className="px-4 py-3 font-medium w-12">No</th>
              <th className="px-4 py-3 font-medium">Mapel</th>
              <th className="px-4 py-3 font-medium w-32 text-center">KKB</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                </td>
              </tr>
            ) : pelajaranList.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500">
                  Belum ada data mata pelajaran.
                </td>
              </tr>
            ) : (
              pelajaranList.map((p, idx) => (
                <tr key={p.id} className="border-b border-slate-100 dark:border-slate-700/60 last:border-0 hover:bg-slate-50/60 dark:hover:bg-slate-700/60">
                  <td className="px-4 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={selected.has(p.id)}
                      onChange={() => toggleSelect(p.id)}
                      className="accent-indigo-600"
                    />
                  </td>
                  <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{idx + 1}</td>
                  <td className="px-4 py-2 font-medium text-slate-800 dark:text-slate-200">
                    {p.mapel} {p.singkatan ? `(${p.singkatan})` : ""}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center justify-center gap-1.5">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={kkbValues[p.id] ?? ""}
                        onChange={(e) =>
                          setKkbValues((prev) => ({ ...prev, [p.id]: e.target.value }))
                        }
                        onBlur={(e) => saveKkb(p.id, e.target.value)}
                        placeholder="-"
                        className="w-20 rounded-lg border border-slate-300 dark:border-slate-600 px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      {savingMapelId === p.id && (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-400" />
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
