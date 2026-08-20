"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { ProfilSekolah } from "@/types/sekolah";
import { Loader2, Check, Upload, ImageOff } from "lucide-react";

const MAX_ORIGINAL_FILE_MB = 5;
const MAX_DIMENSION = 512;

/** Resize gambar di browser (pakai Canvas) sebelum diupload, supaya file
 * besar dari kamera HP tidak membebani storage & bandwidth. Logo diperkecil
 * maksimal 512x512px, output PNG (supaya transparansi logo tetap terjaga). */
function resizeImage(file: File, maxDimension = MAX_DIMENSION): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Gagal memproses gambar (canvas tidak didukung)."));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Gagal mengonversi gambar."));
        },
        "image/png",
        0.9
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("File bukan gambar yang valid."));
    };

    img.src = url;
  });
}

const EMPTY: ProfilSekolah = {
  id: 1,
  header_baris1: "",
  header_baris2: "",
  nama_sekolah: "",
  nss: "",
  npsn: "",
  alamat: "",
  kelurahan: "",
  kecamatan: "",
  kota_kabupaten: "",
  kode_pos: "",
  website: "",
  email: "",
  akreditasi: "",
  logo_sekolah_url: null,
  logo_dinas_url: null,
};

export default function ProfilSekolahPage() {
  const [form, setForm] = useState<ProfilSekolah>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<"logo_sekolah" | "logo_dinas" | null>(null);

  const inputSekolahRef = useRef<HTMLInputElement>(null);
  const inputDinasRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("profil_sekolah")
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

  function updateField<K extends keyof ProfilSekolah>(key: K, value: ProfilSekolah[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.from("profil_sekolah").upsert({ ...form, id: 1 });

    setSaving(false);

    if (error) {
      setError(error.message);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  async function handleLogoUpload(
    field: "logo_sekolah_url" | "logo_dinas_url",
    kind: "logo_sekolah" | "logo_dinas",
    file: File
  ) {
    setError(null);

    if (!file.type.startsWith("image/")) {
      setError("File harus berupa gambar (PNG/JPG).");
      return;
    }
    if (file.size > MAX_ORIGINAL_FILE_MB * 1024 * 1024) {
      setError(`Ukuran file terlalu besar (maks ${MAX_ORIGINAL_FILE_MB} MB). Kompres dulu atau pakai gambar lain.`);
      return;
    }

    setUploading(kind);
    const supabase = createClient();

    let resizedBlob: Blob;
    try {
      resizedBlob = await resizeImage(file);
    } catch (err) {
      setUploading(null);
      setError(err instanceof Error ? err.message : "Gagal memproses gambar.");
      return;
    }

    // Selalu simpan sebagai .png karena hasil resize dikonversi ke PNG
    const path = `${kind}.png`;

    const { error: uploadError } = await supabase.storage
      .from("logos")
      .upload(path, resizedBlob, { upsert: true, contentType: "image/png" });

    if (uploadError) {
      setUploading(null);
      setError(uploadError.message);
      return;
    }

    const { data: publicUrlData } = supabase.storage.from("logos").getPublicUrl(path);
    // Tambahkan timestamp supaya browser tidak menampilkan cache gambar lama
    const urlWithCacheBust = `${publicUrlData.publicUrl}?t=${Date.now()}`;

    const { error: dbError } = await supabase
      .from("profil_sekolah")
      .upsert({ id: 1, [field]: urlWithCacheBust });

    setUploading(null);

    if (dbError) {
      setError(dbError.message);
      return;
    }

    updateField(field, urlWithCacheBust);
  }

  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-4xl mx-auto flex justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Profil Sekolah</h1>
        <p className="text-sm text-slate-500 mt-1">
          Data ini dipakai sebagai kop surat/kepala laporan resmi di seluruh aplikasi
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">
          {error}
        </p>
      )}

      {/* Upload Logo */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
        <p className="text-sm font-semibold text-slate-800 mb-1">Logo</p>
        <p className="text-xs text-slate-400 mb-4">
          Gambar otomatis diperkecil ke maks 512×512px sebelum diupload (ukuran asli maks 5 MB)
        </p>
        <div className="grid sm:grid-cols-2 gap-6">
          {/* Logo Sekolah */}
          <div>
            <p className="text-xs font-medium text-slate-500 mb-2">Logo Sekolah</p>
            <div
              onClick={() => inputSekolahRef.current?.click()}
              className="h-32 w-32 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-colors relative overflow-hidden"
            >
              {uploading === "logo_sekolah" ? (
                <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
              ) : form.logo_sekolah_url ? (
                <Image
                  src={form.logo_sekolah_url}
                  alt="Logo Sekolah"
                  fill
                  className="object-contain p-2"
                />
              ) : (
                <div className="flex flex-col items-center text-slate-400">
                  <Upload className="h-5 w-5 mb-1" />
                  <span className="text-xs">Upload</span>
                </div>
              )}
            </div>
            <input
              ref={inputSekolahRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleLogoUpload("logo_sekolah_url", "logo_sekolah", file);
              }}
            />
          </div>

          {/* Logo Dinas */}
          <div>
            <p className="text-xs font-medium text-slate-500 mb-2">Logo Dinas Pendidikan</p>
            <div
              onClick={() => inputDinasRef.current?.click()}
              className="h-32 w-32 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-colors relative overflow-hidden"
            >
              {uploading === "logo_dinas" ? (
                <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
              ) : form.logo_dinas_url ? (
                <Image
                  src={form.logo_dinas_url}
                  alt="Logo Dinas Pendidikan"
                  fill
                  className="object-contain p-2"
                />
              ) : (
                <div className="flex flex-col items-center text-slate-400">
                  <ImageOff className="h-5 w-5 mb-1" />
                  <span className="text-xs">Upload</span>
                </div>
              )}
            </div>
            <input
              ref={inputDinasRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleLogoUpload("logo_dinas_url", "logo_dinas", file);
              }}
            />
          </div>
        </div>
      </div>

      {/* Form data teks */}
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Header Baris 1
            </label>
            <input
              value={form.header_baris1 ?? ""}
              onChange={(e) => updateField("header_baris1", e.target.value)}
              placeholder="PEMERINTAH KOTA TARAKAN"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Header Baris 2
            </label>
            <input
              value={form.header_baris2 ?? ""}
              onChange={(e) => updateField("header_baris2", e.target.value)}
              placeholder="DINAS PENDIDIKAN"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Nama Sekolah
            </label>
            <input
              value={form.nama_sekolah ?? ""}
              onChange={(e) => updateField("nama_sekolah", e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">NSS</label>
            <input
              value={form.nss ?? ""}
              onChange={(e) => updateField("nss", e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">NPSN</label>
            <input
              value={form.npsn ?? ""}
              onChange={(e) => updateField("npsn", e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Alamat Sekolah
            </label>
            <textarea
              rows={2}
              value={form.alamat ?? ""}
              onChange={(e) => updateField("alamat", e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Kelurahan</label>
            <input
              value={form.kelurahan ?? ""}
              onChange={(e) => updateField("kelurahan", e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Kecamatan</label>
            <input
              value={form.kecamatan ?? ""}
              onChange={(e) => updateField("kecamatan", e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Kota / Kabupaten
            </label>
            <input
              value={form.kota_kabupaten ?? ""}
              onChange={(e) => updateField("kota_kabupaten", e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Kode Pos</label>
            <input
              value={form.kode_pos ?? ""}
              onChange={(e) => updateField("kode_pos", e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Website</label>
            <input
              value={form.website ?? ""}
              onChange={(e) => updateField("website", e.target.value)}
              placeholder="http://smpn14tarakan.sch.id"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
            <input
              value={form.email ?? ""}
              onChange={(e) => updateField("email", e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Akreditasi Sekolah
            </label>
            <input
              value={form.akreditasi ?? ""}
              onChange={(e) => updateField("akreditasi", e.target.value)}
              placeholder="AKREDITASI B"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
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
