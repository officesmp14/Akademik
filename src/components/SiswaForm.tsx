"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Siswa,
  STATUS_SISWA_OPTIONS,
  YA_TIDAK_OPTIONS,
  KEBUTUHAN_KHUSUS_OPTIONS,
} from "@/types/siswa";

type RefOption = { value: string; label: string };

const emptyRefOptions = {
  agama: [] as RefOption[],
  jenisTinggal: [] as RefOption[],
  transportasi: [] as RefOption[],
  pekerjaan: [] as RefOption[],
  pendidikan: [] as RefOption[],
  penghasilan: [] as RefOption[],
  jalur: [] as RefOption[],
};

const REF_TABLE_BY_KEY: Record<keyof typeof emptyRefOptions, string> = {
  agama: "ref_agama",
  jenisTinggal: "ref_jenis_tinggal",
  transportasi: "ref_moda_transportasi",
  pekerjaan: "ref_pekerjaan",
  pendidikan: "ref_jenjang_pendidikan",
  penghasilan: "ref_penghasilan",
  jalur: "ref_jalur_daftar",
};
import { TextField, SelectField, TextareaField } from "@/components/form-fields";
import {
  User,
  MapPin,
  Users,
  GraduationCap,
  HeartHandshake,
  Loader2,
  ChevronLeft,
} from "lucide-react";

const TABS = [
  { key: "pribadi", label: "Data Pribadi", icon: User },
  { key: "alamat", label: "Alamat & Kontak", icon: MapPin },
  { key: "keluarga", label: "Orang Tua & Wali", icon: Users },
  { key: "akademik", label: "Akademik", icon: GraduationCap },
  { key: "bantuan", label: "Bantuan & Ekonomi", icon: HeartHandshake },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function SiswaForm({
  initialData,
  siswaId,
}: {
  initialData?: Siswa;
  siswaId?: string;
}) {
  const router = useRouter();
  const isEdit = Boolean(siswaId);
  const [activeTab, setActiveTab] = useState<TabKey>("pribadi");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { register, handleSubmit, watch } = useForm<Siswa>({
    defaultValues: initialData ?? {},
  });
  const statusSiswa = watch("status_siswa");

  const [refOptions, setRefOptions] = useState(emptyRefOptions);

  const emptyMutasiForm = {
    tanggal_mutasi: "",
    alasan_mutasi: "",
    sekolah_tujuan: "",
    alamat_sekolah_tujuan: "",
    link_dokumen: "",
  };
  const [mutasiForm, setMutasiForm] = useState(emptyMutasiForm);

  useEffect(() => {
    if (!siswaId) return;
    async function fetchMutasi() {
      const supabase = createClient();
      const { data } = await supabase
        .from("siswa_mutasi_keluar")
        .select("tanggal_mutasi, alasan_mutasi, sekolah_tujuan, alamat_sekolah_tujuan, link_dokumen")
        .eq("siswa_id", siswaId)
        .maybeSingle();

      if (data) {
        setMutasiForm({
          tanggal_mutasi: data.tanggal_mutasi ?? "",
          alasan_mutasi: data.alasan_mutasi ?? "",
          sekolah_tujuan: data.sekolah_tujuan ?? "",
          alamat_sekolah_tujuan: data.alamat_sekolah_tujuan ?? "",
          link_dokumen: data.link_dokumen ?? "",
        });
      }
    }
    fetchMutasi();
  }, [siswaId]);

  useEffect(() => {
    async function fetchRefOptions() {
      const supabase = createClient();
      const keys = Object.keys(REF_TABLE_BY_KEY) as (keyof typeof emptyRefOptions)[];
      const results = await Promise.all(
        keys.map((key) =>
          supabase.from(REF_TABLE_BY_KEY[key]).select("uraian").order("kode", { ascending: true })
        )
      );

      const next = { ...emptyRefOptions };
      keys.forEach((key, i) => {
        next[key] = (results[i].data ?? []).map((r: { uraian: string }) => ({
          value: r.uraian,
          label: r.uraian,
        }));
      });
      setRefOptions(next);
    }
    fetchRefOptions();
  }, []);

  async function onSubmit(values: Siswa) {
    setSaving(true);
    setErrorMsg(null);
    const supabase = createClient();

    // Bersihkan string kosong -> null agar konsisten di database
    const payload = Object.fromEntries(
      Object.entries(values).map(([k, v]) => [k, v === "" ? null : v])
    );

    let targetId = siswaId;

    if (isEdit) {
      const { error } = await supabase.from("siswa01").update(payload).eq("id", siswaId);
      if (error) {
        setSaving(false);
        setErrorMsg(error.message);
        return;
      }
    } else {
      const { data, error } = await supabase.from("siswa01").insert(payload).select("id").single();
      if (error) {
        setSaving(false);
        setErrorMsg(error.message);
        return;
      }
      targetId = data.id;
    }

    // Riwayat mutasi keluar dicatat terpisah dari siswa01, hanya kalau
    // status siswa saat ini "Mutasi".
    if (values.status_siswa === "Mutasi" && targetId) {
      const { error: mutasiError } = await supabase.from("siswa_mutasi_keluar").upsert(
        {
          siswa_id: targetId,
          tanggal_mutasi: mutasiForm.tanggal_mutasi || null,
          alasan_mutasi: mutasiForm.alasan_mutasi || null,
          sekolah_tujuan: mutasiForm.sekolah_tujuan || null,
          alamat_sekolah_tujuan: mutasiForm.alamat_sekolah_tujuan || null,
          link_dokumen: mutasiForm.link_dokumen || null,
        },
        { onConflict: "siswa_id" }
      );

      if (mutasiError) {
        setSaving(false);
        setErrorMsg("Data siswa tersimpan, tapi data mutasi gagal disimpan: " + mutasiError.message);
        return;
      }
    }

    setSaving(false);
    router.back();
    router.refresh();
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <button
        type="button"
        onClick={() => router.back()}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 mb-4"
      >
        <ChevronLeft className="h-4 w-4" />
        Kembali
      </button>

      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-6">
        {isEdit ? (
          <>
            Edit Data Siswa{" "}
            {initialData?.nama && <span className="text-blue-600">({initialData.nama})</span>}
          </>
        ) : (
          "Tambah Siswa Baru"
        )}
      </h1>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        {/* Tab navigation */}
        <div className="flex overflow-x-auto border-b border-slate-200 dark:border-slate-700 mb-6 gap-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                type="button"
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  isActive
                    ? "border-indigo-600 text-indigo-700 dark:text-indigo-400"
                    : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
          {/* TAB 1: Data Pribadi */}
          <div className={activeTab === "pribadi" ? "grid sm:grid-cols-2 gap-5" : "hidden"}>
            <TextField label="Nama Lengkap" name="nama" register={register} required />
            <TextField label="NIPD" name="nipd" register={register} />
            <TextField label="NISN" name="nisn" register={register} />
            <SelectField label="Jenis Kelamin" name="jk" register={register} options={[{ value: "L", label: "Laki-laki" }, { value: "P", label: "Perempuan" }]} />
            <TextField label="Tempat Lahir" name="tempat_lahir" register={register} />
            <TextField label="Tanggal Lahir" name="tanggal_lahir" type="date" register={register} />
            <TextField label="NIK" name="nik" register={register} />
            <SelectField label="Agama" name="agama" register={register} options={refOptions.agama} />
            <TextField label="Anak Ke-" name="anak_ke" register={register} type="number" />
            <TextField label="Jumlah Saudara" name="jml_saudara" register={register} type="number" />
            <TextField label="Sekolah Asal" name="sekolah_asal" register={register} />
            <SelectField label="Kebutuhan Khusus" name="kebutuhan_khusus" register={register} options={KEBUTUHAN_KHUSUS_OPTIONS} />
            <TextField label="No. Akta Lahir" name="no_akta_lahir" register={register} />
            <TextField label="No. Kartu Keluarga" name="no_kk" register={register} />
            <TextField label="Berat Badan (kg)" name="berat_badan" register={register} type="number" />
            <TextField label="Tinggi Badan (cm)" name="tinggi_badan" register={register} type="number" />
            <TextField label="Lingkar Kepala (cm)" name="lingkar_kepala" register={register} type="number" />
            <TextField label="Tahun Masuk" name="tahun_masuk" register={register} />
            <SelectField label="Semester" name="semester" register={register} options={["Ganjil", "Genap"]} />
          </div>

          {/* TAB 2: Alamat & Kontak */}
          <div className={activeTab === "alamat" ? "grid sm:grid-cols-2 gap-5" : "hidden"}>
            <TextareaField label="Alamat" name="alamat" register={register} />
            <TextField label="RT" name="rt" register={register} />
            <TextField label="RW" name="rw" register={register} />
            <TextField label="Dusun" name="dusun" register={register} />
            <TextField label="Kelurahan / Desa" name="kelurahan" register={register} />
            <TextField label="Kecamatan" name="kecamatan" register={register} />
            <TextField label="Kode Pos" name="kode_pos" register={register} />
            <SelectField label="Jenis Tinggal" name="jenis_tinggal" register={register} options={refOptions.jenisTinggal} />
            <SelectField label="Alat Transportasi" name="alat_transportasi" register={register} options={refOptions.transportasi} />
            <TextField label="Jarak Rumah ke Sekolah (km)" name="jarak_rumah" register={register} type="number" />
            <TextField label="Waktu Tempuh (menit)" name="jarak_tempuh" register={register} type="number" />
            <TextField label="Lintang" name="lintang" register={register} placeholder="-6.200000" />
            <TextField label="Bujur" name="bujur" register={register} placeholder="106.816666" />
            <TextField label="Telepon Rumah" name="telepon" register={register} />
            <TextField label="No. HP" name="hp" register={register} />
            <TextField label="Email" name="email" register={register} type="email" />
          </div>

          {/* TAB 3: Orang Tua & Wali */}
          <div className={activeTab === "keluarga" ? "space-y-8" : "hidden"}>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4 pb-2 border-b border-slate-100 dark:border-slate-700/60">
                Data Ayah
              </h3>
              <div className="grid sm:grid-cols-2 gap-5">
                <TextField label="Nama Ayah" name="nama_ayah" register={register} />
                <TextField label="Tahun Lahir Ayah" name="ayah_tahun_lahir" register={register} />
                <TextField label="NIK Ayah" name="ayah_nik" register={register} />
                <SelectField label="Pendidikan Ayah" name="ayah_pendidikan" register={register} options={refOptions.pendidikan} />
                <SelectField label="Pekerjaan Ayah" name="ayah_pekerjaan" register={register} options={refOptions.pekerjaan} />
                <SelectField label="Penghasilan Ayah" name="ayah_penghasilan" register={register} options={refOptions.penghasilan} />
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4 pb-2 border-b border-slate-100 dark:border-slate-700/60">
                Data Ibu
              </h3>
              <div className="grid sm:grid-cols-2 gap-5">
                <TextField label="Nama Ibu" name="nama_ibu" register={register} />
                <TextField label="Tahun Lahir Ibu" name="ibu_tahun_lahir" register={register} />
                <TextField label="NIK Ibu" name="ibu_nik" register={register} />
                <SelectField label="Pendidikan Ibu" name="ibu_pendidikan" register={register} options={refOptions.pendidikan} />
                <SelectField label="Pekerjaan Ibu" name="ibu_pekerjaan" register={register} options={refOptions.pekerjaan} />
                <SelectField label="Penghasilan Ibu" name="ibu_penghasilan" register={register} options={refOptions.penghasilan} />
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4 pb-2 border-b border-slate-100 dark:border-slate-700/60">
                Data Wali (jika ada)
              </h3>
              <div className="grid sm:grid-cols-2 gap-5">
                <TextField label="Nama Wali" name="nama_wali" register={register} />
                <TextField label="Tahun Lahir Wali" name="wali_tahun_lahir" register={register} />
                <TextField label="NIK Wali" name="wali_nik" register={register} />
                <SelectField label="Pendidikan Wali" name="wali_pendidikan" register={register} options={refOptions.pendidikan} />
                <SelectField label="Pekerjaan Wali" name="wali_pekerjaan" register={register} options={refOptions.pekerjaan} />
                <SelectField label="Penghasilan Wali" name="wali_penghasilan" register={register} options={refOptions.penghasilan} />
              </div>
            </div>
          </div>

          {/* TAB 4: Akademik */}
          <div className={activeTab === "akademik" ? "grid sm:grid-cols-2 gap-5" : "hidden"}>
            <TextField label="Rombel / Kelas" name="rombel" register={register} />
            <SelectField label="Jalur Masuk" name="jalur" register={register} options={refOptions.jalur} />
            <SelectField label="Status Siswa" name="status_siswa" register={register} options={STATUS_SISWA_OPTIONS} />
            <TextField label="No. Peserta UN" name="no_peserta_un" register={register} />
            <TextField label="No. Seri Ijazah" name="no_seri_ijazah" register={register} />
            <TextField label="No. SKHUN" name="skhun" register={register} />

            {statusSiswa === "Mutasi" && (
              <div className="sm:col-span-2 border-t border-slate-100 dark:border-slate-700/60 pt-5 mt-1">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">Data Mutasi Keluar</h3>
                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                      Tanggal Mutasi
                    </label>
                    <input
                      type="date"
                      value={mutasiForm.tanggal_mutasi}
                      onChange={(e) =>
                        setMutasiForm((f) => ({ ...f, tanggal_mutasi: e.target.value }))
                      }
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                      Sekolah Tujuan
                    </label>
                    <input
                      type="text"
                      value={mutasiForm.sekolah_tujuan}
                      onChange={(e) =>
                        setMutasiForm((f) => ({ ...f, sekolah_tujuan: e.target.value }))
                      }
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                      Alasan Mutasi
                    </label>
                    <textarea
                      rows={3}
                      value={mutasiForm.alasan_mutasi}
                      onChange={(e) =>
                        setMutasiForm((f) => ({ ...f, alasan_mutasi: e.target.value }))
                      }
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                      Alamat Sekolah Tujuan
                    </label>
                    <textarea
                      rows={3}
                      value={mutasiForm.alamat_sekolah_tujuan}
                      onChange={(e) =>
                        setMutasiForm((f) => ({ ...f, alamat_sekolah_tujuan: e.target.value }))
                      }
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                      Link Dokumen (Bukti Surat Keluar Dapodik)
                    </label>
                    <input
                      type="url"
                      value={mutasiForm.link_dokumen}
                      onChange={(e) =>
                        setMutasiForm((f) => ({ ...f, link_dokumen: e.target.value }))
                      }
                      placeholder="https://drive.google.com/..."
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* TAB 5: Bantuan & Ekonomi */}
          <div className={activeTab === "bantuan" ? "grid sm:grid-cols-2 gap-5" : "hidden"}>
            <SelectField label="Penerima KPS" name="penerima_kps" register={register} options={YA_TIDAK_OPTIONS} />
            <TextField label="No. KPS" name="no_kps" register={register} />
            <SelectField label="Penerima KIP" name="penerima_kip" register={register} options={YA_TIDAK_OPTIONS} />
            <TextField label="Nomor KIP" name="nomor_kip" register={register} />
            <TextField label="Nama di KIP" name="nama_kip" register={register} />
            <TextField label="Nomor KKS" name="nomor_kks" register={register} />
            <SelectField label="Layak PIP" name="layak_pip" register={register} options={YA_TIDAK_OPTIONS} />
            <TextareaField label="Alasan PIP" name="alasan_pip" register={register} />
            <TextField label="Bank" name="bank" register={register} />
            <TextField label="No. Rekening" name="no_rekening" register={register} />
            <TextField label="Rekening Atas Nama" name="rekening_atas_nama" register={register} />
          </div>
        </div>

        {errorMsg && (
          <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg px-3 py-2 mt-4">
            {errorMsg}
          </p>
        )}

        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white text-sm font-medium px-5 py-2.5 hover:bg-indigo-700 transition-colors disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Simpan Data
          </button>
        </div>
      </form>
    </div>
  );
}
