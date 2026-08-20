"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  DOKUMEN_MUTASI_MASUK_FIELDS,
  MUTASI_MASUK_STORAGE_BUCKET,
  SiswaMutasiMasuk,
} from "@/types/mutasi-masuk";
import { ChevronLeft, Loader2, Upload, FileCheck2, ExternalLink } from "lucide-react";

type FormState = {
  nama_siswa: string;
  nisn: string;
  asal_provinsi: string;
  asal_kab_kota: string;
  asal_kecamatan: string;
  asal_npsn_sekolah: string;
  asal_nama_sekolah: string;
  kelas_tujuan: string;
};

type DokKey = (typeof DOKUMEN_MUTASI_MASUK_FIELDS)[number]["key"];

function fieldLabel(label: string) {
  return <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>;
}

export default function MutasiMasukForm({
  initialData,
  recordId,
}: {
  initialData?: SiswaMutasiMasuk;
  recordId?: string;
}) {
  const router = useRouter();
  const isEdit = Boolean(recordId);

  const [form, setForm] = useState<FormState>(() => ({
    nama_siswa: initialData?.nama_siswa ?? "",
    nisn: initialData?.nisn ?? "",
    asal_provinsi: initialData?.asal_provinsi ?? "",
    asal_kab_kota: initialData?.asal_kab_kota ?? "",
    asal_kecamatan: initialData?.asal_kecamatan ?? "",
    asal_npsn_sekolah: initialData?.asal_npsn_sekolah ?? "",
    asal_nama_sekolah: initialData?.asal_nama_sekolah ?? "",
    kelas_tujuan: initialData?.kelas_tujuan ?? "",
  }));
  const [files, setFiles] = useState<Partial<Record<DokKey, File>>>({});
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function updateForm(key: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function updateFile(key: DokKey, file: File | null) {
    setFiles((f) => {
      const next = { ...f };
      if (file) next[key] = file;
      else delete next[key];
      return next;
    });
  }

  async function openExistingDocument(path: string) {
    const supabase = createClient();
    const { data, error } = await supabase.storage
      .from(MUTASI_MASUK_STORAGE_BUCKET)
      .createSignedUrl(path, 60);

    if (error || !data) {
      setErrorMsg(error?.message ?? "Gagal membuka dokumen.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nama_siswa.trim()) return;

    setSaving(true);
    setErrorMsg(null);
    const supabase = createClient();

    const id = recordId ?? crypto.randomUUID();
    const dokPaths: Partial<Record<DokKey, string>> = {};

    for (const { key } of DOKUMEN_MUTASI_MASUK_FIELDS) {
      const file = files[key];
      if (!file) continue;

      const ext = file.name.split(".").pop() || "bin";
      const path = `${id}/${key}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(MUTASI_MASUK_STORAGE_BUCKET)
        .upload(path, file, { upsert: true });

      if (uploadError) {
        setSaving(false);
        setErrorMsg(`Gagal upload dokumen "${key}": ${uploadError.message}`);
        return;
      }

      dokPaths[key] = path;

      // Kalau path lama beda ekstensi (mis. ganti dari .pdf ke .jpg),
      // bersihkan file lama supaya tidak jadi sampah di storage.
      const oldPath = initialData?.[key];
      if (oldPath && oldPath !== path) {
        await supabase.storage.from(MUTASI_MASUK_STORAGE_BUCKET).remove([oldPath]);
      }
    }

    if (isEdit) {
      const payload = Object.fromEntries(
        Object.entries({ ...form, ...dokPaths }).map(([k, v]) => [k, v === "" ? null : v])
      );
      const { error } = await supabase.from("siswa_mutasi_masuk").update(payload).eq("id", id);
      setSaving(false);
      if (error) {
        setErrorMsg(error.message);
        return;
      }
    } else {
      const payload = Object.fromEntries(
        Object.entries({ id, ...form, ...dokPaths, status: "Diajukan" }).map(([k, v]) => [
          k,
          v === "" ? null : v,
        ])
      );
      const { error } = await supabase.from("siswa_mutasi_masuk").insert(payload);
      setSaving(false);
      if (error) {
        setErrorMsg(error.message);
        return;
      }
    }

    router.push("/siswa/mutasi-masuk");
    router.refresh();
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <Link
        href="/siswa/mutasi-masuk"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4"
      >
        <ChevronLeft className="h-4 w-4" />
        Kembali ke Siswa Mutasi Masuk
      </Link>

      <h1 className="text-2xl font-semibold text-slate-900 mb-6">
        {isEdit ? "Ubah Pengajuan Mutasi Masuk" : "Tambah Pengajuan Mutasi Masuk"}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4 pb-2 border-b border-slate-100">
            Data Siswa & Asal Sekolah
          </h3>
          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              {fieldLabel("Nama Siswa")}
              <input
                type="text"
                required
                value={form.nama_siswa}
                onChange={(e) => updateForm("nama_siswa", e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              {fieldLabel("NISN")}
              <input
                type="text"
                value={form.nisn}
                onChange={(e) => updateForm("nisn", e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              {fieldLabel("Kelas Tujuan")}
              <input
                type="text"
                placeholder="mis. VII.1"
                value={form.kelas_tujuan}
                onChange={(e) => updateForm("kelas_tujuan", e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              {fieldLabel("NPSN Sekolah Asal")}
              <input
                type="text"
                value={form.asal_npsn_sekolah}
                onChange={(e) => updateForm("asal_npsn_sekolah", e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              {fieldLabel("Nama Sekolah Asal")}
              <input
                type="text"
                value={form.asal_nama_sekolah}
                onChange={(e) => updateForm("asal_nama_sekolah", e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              {fieldLabel("Provinsi Asal")}
              <input
                type="text"
                value={form.asal_provinsi}
                onChange={(e) => updateForm("asal_provinsi", e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              {fieldLabel("Kabupaten/Kota Asal")}
              <input
                type="text"
                value={form.asal_kab_kota}
                onChange={(e) => updateForm("asal_kab_kota", e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              {fieldLabel("Kecamatan Asal")}
              <input
                type="text"
                value={form.asal_kecamatan}
                onChange={(e) => updateForm("asal_kecamatan", e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4 pb-2 border-b border-slate-100">
            Upload Dokumen
          </h3>
          <div className="grid sm:grid-cols-2 gap-5">
            {DOKUMEN_MUTASI_MASUK_FIELDS.map(({ key, label }) => {
              const file = files[key];
              const existingPath = initialData?.[key];
              return (
                <div key={key}>
                  {fieldLabel(label)}
                  <label
                    className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-colors ${
                      file
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-slate-300 text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    {file ? (
                      <FileCheck2 className="h-4 w-4 shrink-0" />
                    ) : (
                      <Upload className="h-4 w-4 shrink-0" />
                    )}
                    <span className="truncate">
                      {file ? file.name : existingPath ? "Ganti file (opsional)" : "Pilih file (PDF/gambar)"}
                    </span>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={(e) => updateFile(key, e.target.files?.[0] ?? null)}
                    />
                  </label>
                  {existingPath && !file && (
                    <button
                      type="button"
                      onClick={() => openExistingDocument(existingPath)}
                      className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium mt-1.5"
                    >
                      Lihat dokumen yang sudah diupload <ExternalLink className="h-3 w-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {errorMsg && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {errorMsg}
          </p>
        )}

        <div className="flex items-center justify-end gap-3">
          <Link
            href="/siswa/mutasi-masuk"
            className="px-4 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Batal
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white text-sm font-medium px-5 py-2.5 hover:bg-indigo-700 transition-colors disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? "Simpan Perubahan" : "Simpan Pengajuan"}
          </button>
        </div>
      </form>
    </div>
  );
}
