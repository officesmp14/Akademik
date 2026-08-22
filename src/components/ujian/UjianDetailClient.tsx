"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Ujian, UjianSoal, SoalTipe } from "@/types/ujian";
import { Plus, Pencil, Trash2, Loader2, X, ListChecks, KeyRound } from "lucide-react";

const STATUS_OPTIONS: { value: Ujian["status"]; label: string }[] = [
  { value: "draft", label: "Draft (belum bisa dibuka sesi)" },
  { value: "terbit", label: "Terbit" },
  { value: "arsip", label: "Arsip" },
];

type SoalFormState = {
  tipe: SoalTipe;
  pertanyaan: string;
  opsiA: string;
  opsiB: string;
  opsiC: string;
  opsiD: string;
  kunci: string;
  bobot: number;
};

const emptySoalForm: SoalFormState = {
  tipe: "pilihan_ganda",
  pertanyaan: "",
  opsiA: "",
  opsiB: "",
  opsiC: "",
  opsiD: "",
  kunci: "A",
  bobot: 1,
};

function soalToForm(soal: UjianSoal): SoalFormState {
  const opsiMap = new Map((soal.opsi ?? []).map((o) => [o.key, o.teks]));
  return {
    tipe: soal.tipe,
    pertanyaan: soal.pertanyaan,
    opsiA: opsiMap.get("A") ?? "",
    opsiB: opsiMap.get("B") ?? "",
    opsiC: opsiMap.get("C") ?? "",
    opsiD: opsiMap.get("D") ?? "",
    kunci: soal.kunci_jawaban ?? "A",
    bobot: soal.bobot,
  };
}

export default function UjianDetailClient({ ujian, soalAwal }: { ujian: Ujian; soalAwal: UjianSoal[] }) {
  const [info, setInfo] = useState({
    judul: ujian.judul,
    mapel: ujian.mapel ?? "",
    durasi_menit: ujian.durasi_menit,
    acak_soal: ujian.acak_soal,
    status: ujian.status,
  });
  const [savingInfo, setSavingInfo] = useState(false);
  const [infoSaved, setInfoSaved] = useState(false);
  const [infoError, setInfoError] = useState<string | null>(null);

  const [soalList, setSoalList] = useState<UjianSoal[]>(soalAwal);
  const [showSoalForm, setShowSoalForm] = useState(false);
  const [soalForm, setSoalForm] = useState<SoalFormState>(emptySoalForm);
  const [editingSoalId, setEditingSoalId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UjianSoal | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function refetchSoal() {
    const supabase = createClient();
    const { data } = await supabase
      .from("ujian_soal")
      .select("*")
      .eq("ujian_id", ujian.id)
      .order("urutan", { ascending: true });
    setSoalList(data ?? []);
  }

  async function handleSaveInfo(e: React.FormEvent) {
    e.preventDefault();
    setSavingInfo(true);
    setInfoError(null);
    setInfoSaved(false);
    const supabase = createClient();

    const { error } = await supabase
      .from("ujian")
      .update({
        judul: info.judul.trim(),
        mapel: info.mapel.trim() || null,
        durasi_menit: info.durasi_menit,
        acak_soal: info.acak_soal,
        status: info.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ujian.id);

    setSavingInfo(false);
    if (error) {
      setInfoError(error.message);
      return;
    }
    setInfoSaved(true);
    setTimeout(() => setInfoSaved(false), 2000);
  }

  function openAddSoal() {
    setSoalForm(emptySoalForm);
    setEditingSoalId(null);
    setActionError(null);
    setShowSoalForm(true);
  }

  function openEditSoal(soal: UjianSoal) {
    setSoalForm(soalToForm(soal));
    setEditingSoalId(soal.id);
    setActionError(null);
    setShowSoalForm(true);
  }

  async function handleSoalSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!soalForm.pertanyaan.trim()) {
      setActionError("Pertanyaan wajib diisi.");
      return;
    }

    const isPg = soalForm.tipe === "pilihan_ganda";
    if (isPg && (!soalForm.opsiA.trim() || !soalForm.opsiB.trim() || !soalForm.opsiC.trim() || !soalForm.opsiD.trim())) {
      setActionError("Isi semua 4 pilihan jawaban (A-D).");
      return;
    }

    setSaving(true);
    setActionError(null);
    const supabase = createClient();

    const payload = {
      ujian_id: ujian.id,
      tipe: soalForm.tipe,
      pertanyaan: soalForm.pertanyaan.trim(),
      opsi: isPg
        ? [
            { key: "A", teks: soalForm.opsiA.trim() },
            { key: "B", teks: soalForm.opsiB.trim() },
            { key: "C", teks: soalForm.opsiC.trim() },
            { key: "D", teks: soalForm.opsiD.trim() },
          ]
        : null,
      kunci_jawaban: isPg ? soalForm.kunci : null,
      bobot: soalForm.bobot,
    };

    const { error } = editingSoalId
      ? await supabase.from("ujian_soal").update(payload).eq("id", editingSoalId)
      : await supabase.from("ujian_soal").insert({ ...payload, urutan: soalList.length });

    setSaving(false);
    if (error) {
      setActionError(error.message);
      return;
    }
    setShowSoalForm(false);
    refetchSoal();
  }

  async function handleDeleteSoal() {
    if (!deleteTarget) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("ujian_soal").delete().eq("id", deleteTarget.id);
    setSaving(false);
    if (error) {
      setActionError(error.message);
      return;
    }
    setDeleteTarget(null);
    refetchSoal();
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <Link href="/kelola-ujian" className="text-xs text-slate-400 dark:text-slate-500 hover:text-indigo-600">
            &larr; Kembali ke Kelola Ujian
          </Link>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mt-1">{ujian.judul}</h1>
        </div>
        <Link
          href={`/kelola-ujian/${ujian.id}/sesi`}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white text-sm font-medium px-4 py-2 hover:bg-indigo-700"
        >
          <KeyRound className="h-4 w-4" />
          Kelola Sesi
        </Link>
      </div>

      <form onSubmit={handleSaveInfo} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 mb-6 space-y-4">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Info Ujian</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">Judul</label>
            <input
              value={info.judul}
              onChange={(e) => setInfo((f) => ({ ...f, judul: e.target.value }))}
              required
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">Mata Pelajaran</label>
            <input
              value={info.mapel}
              onChange={(e) => setInfo((f) => ({ ...f, mapel: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">Durasi (menit)</label>
            <input
              type="number"
              min={1}
              value={info.durasi_menit}
              onChange={(e) => setInfo((f) => ({ ...f, durasi_menit: Number(e.target.value) }))}
              required
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">Status</label>
            <select
              value={info.status}
              onChange={(e) => setInfo((f) => ({ ...f, status: e.target.value as Ujian["status"] }))}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
          <input
            type="checkbox"
            checked={info.acak_soal}
            onChange={(e) => setInfo((f) => ({ ...f, acak_soal: e.target.checked }))}
            className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500"
          />
          Acak urutan soal untuk tiap siswa
        </label>

        {infoError && (
          <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg px-3 py-2">{infoError}</p>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={savingInfo}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 text-white text-sm font-medium px-4 py-2 hover:bg-slate-800 disabled:opacity-60"
          >
            {savingInfo && <Loader2 className="h-4 w-4 animate-spin" />}
            Simpan
          </button>
          {infoSaved && <span className="text-sm text-emerald-600 dark:text-emerald-400">Tersimpan.</span>}
        </div>
      </form>

      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Bank Soal ({soalList.length})</h2>
        <button
          onClick={openAddSoal}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white text-sm font-medium px-3 py-1.5 hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          Tambah Soal
        </button>
      </div>

      <div className="space-y-2">
        {soalList.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-10 text-center text-slate-400 dark:text-slate-500">
            <ListChecks className="h-6 w-6 mx-auto mb-2 text-slate-300" />
            Belum ada soal. Tambahkan soal pilihan ganda atau esai.
          </div>
        ) : (
          soalList.map((soal, idx) => (
            <div key={soal.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex items-start gap-3">
              <span className="text-xs font-medium text-slate-400 dark:text-slate-500 mt-0.5">{idx + 1}.</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      soal.tipe === "pilihan_ganda" ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400" : "bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400"
                    }`}
                  >
                    {soal.tipe === "pilihan_ganda" ? "Pilihan Ganda" : "Esai"}
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">Bobot {soal.bobot}</span>
                </div>
                <p className="text-sm text-slate-800 dark:text-slate-200 line-clamp-2">{soal.pertanyaan}</p>
                {soal.tipe === "pilihan_ganda" && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Kunci jawaban: {soal.kunci_jawaban}</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => openEditSoal(soal)}
                  title="Ubah"
                  className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setDeleteTarget(soal)}
                  title="Hapus"
                  className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showSoalForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-lg w-full shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">{editingSoalId ? "Ubah Soal" : "Tambah Soal"}</h3>
              <button onClick={() => setShowSoalForm(false)}>
                <X className="h-4 w-4 text-slate-400 dark:text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSoalSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">Tipe Soal</label>
                <select
                  value={soalForm.tipe}
                  onChange={(e) => setSoalForm((f) => ({ ...f, tipe: e.target.value as SoalTipe }))}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="pilihan_ganda">Pilihan Ganda</option>
                  <option value="esai">Esai</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">Pertanyaan</label>
                <textarea
                  value={soalForm.pertanyaan}
                  onChange={(e) => setSoalForm((f) => ({ ...f, pertanyaan: e.target.value }))}
                  required
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {soalForm.tipe === "pilihan_ganda" && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Pilihan Jawaban</label>
                  {(["A", "B", "C", "D"] as const).map((huruf) => {
                    const key = `opsi${huruf}` as "opsiA" | "opsiB" | "opsiC" | "opsiD";
                    return (
                      <div key={huruf} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="kunci"
                          checked={soalForm.kunci === huruf}
                          onChange={() => setSoalForm((f) => ({ ...f, kunci: huruf }))}
                          title={`Jadikan ${huruf} sebagai kunci jawaban`}
                          className="h-4 w-4 shrink-0"
                        />
                        <span className="text-sm font-medium w-4 shrink-0">{huruf}</span>
                        <input
                          value={soalForm[key]}
                          onChange={(e) => setSoalForm((f) => ({ ...f, [key]: e.target.value }))}
                          required
                          className="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    );
                  })}
                  <p className="text-xs text-slate-400 dark:text-slate-500">Pilih radio di kiri untuk menandai kunci jawaban.</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">Bobot Nilai</label>
                <input
                  type="number"
                  min={1}
                  value={soalForm.bobot}
                  onChange={(e) => setSoalForm((f) => ({ ...f, bobot: Number(e.target.value) }))}
                  required
                  className="w-32 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {actionError && (
                <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg px-3 py-2">
                  {actionError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowSoalForm(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white text-sm font-medium px-4 py-2 hover:bg-indigo-700 disabled:opacity-60"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1.5">Hapus soal ini?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5 line-clamp-2">{deleteTarget.pertanyaan}</p>
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
                onClick={handleDeleteSoal}
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
