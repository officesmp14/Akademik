"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Gtk,
  JENIS_PTK_OPTIONS,
  STATUS_KEPEGAWAIAN_OPTIONS,
  AGAMA_OPTIONS_GTK,
  STATUS_PERKAWINAN_OPTIONS,
  YA_TIDAK_OPTIONS,
  LEMBAGA_PENGANGKATAN_OPTIONS,
  SUMBER_GAJI_OPTIONS,
  STATUS_AKTIF_OPTIONS,
  STATUS_PASANGAN_OPTIONS,
  JENJANG_PENDIDIKAN_OPTIONS,
} from "@/types/gtk";
import { TextField, SelectField, TextareaField } from "@/components/form-fields";
import GtkPenugasanTab from "@/components/GtkPenugasanTab";
import { useModulePermission } from "@/lib/role-context";
import {
  User,
  Briefcase,
  Users,
  MapPin,
  FileText,
  GraduationCap,
  BookOpen,
  Loader2,
  ChevronLeft,
} from "lucide-react";
import Link from "next/link";

const TABS = [
  { key: "pribadi", label: "Data Pribadi", icon: User },
  { key: "pendidikan", label: "Pendidikan & Sertifikasi", icon: GraduationCap },
  { key: "kepegawaian", label: "Kepegawaian", icon: Briefcase },
  { key: "keluarga", label: "Keluarga", icon: Users },
  { key: "alamat", label: "Alamat & Kontak", icon: MapPin },
  { key: "dokumen", label: "Dokumen & Rekening", icon: FileText },
  { key: "penugasan", label: "Penugasan Mengajar", icon: BookOpen },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function GtkForm({
  initialData,
  gtkId,
  isOwnProfile = false,
}: {
  initialData?: Gtk;
  gtkId?: string;
  isOwnProfile?: boolean;
}) {
  const router = useRouter();
  const { canEdit } = useModulePermission("gtk");
  // Profil sendiri (guru/staf TU): selalu bisa edit, diatur RLS "Guru TU
  // update own datagtk", terlepas dari hak akses modul 'gtk' yang mungkin
  // tidak mereka miliki. Selain itu (halaman /gtk/[id] umum): ikut canEdit.
  const isReadOnly = isOwnProfile ? false : !canEdit;
  const isEdit = Boolean(gtkId);
  const [activeTab, setActiveTab] = useState<TabKey>("pribadi");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { register, handleSubmit, watch } = useForm<Gtk>({
    defaultValues: initialData ?? {},
  });
  const statusAktif = watch("status_aktif");

  const [jenisPtkPddOptions, setJenisPtkPddOptions] = useState<string[]>([]);
  useEffect(() => {
    async function fetchJenisPtkPddOptions() {
      const supabase = createClient();
      const { data } = await supabase
        .from("ref_jenisptk_dinaspdd")
        .select("uraian")
        .order("kode", { ascending: true });
      setJenisPtkPddOptions((data ?? []).map((d) => d.uraian));
    }
    fetchJenisPtkPddOptions();
  }, []);

  async function onSubmit(values: Gtk) {
    if (values.status_aktif === "N" && (!values.tanggal_tidak_aktif || !values.alasan_tidak_aktif?.trim())) {
      setErrorMsg(
        "Tanggal Mulai Tidak Aktif dan Alasan Tidak Aktif wajib diisi (tab Kepegawaian) kalau Status Aktif dipilih \"Tidak Aktif\"."
      );
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    const supabase = createClient();

    // Kalau statusnya bukan Tidak Aktif, kosongkan tanggal & alasan supaya
    // tidak ada data basi tersisa saat GTK diaktifkan lagi.
    if (values.status_aktif !== "N") {
      values.tanggal_tidak_aktif = null;
      values.alasan_tidak_aktif = null;
    }

    const payload = Object.fromEntries(
      Object.entries(values).map(([k, v]) => [k, v === "" ? null : v])
    );

    const { error } = isEdit
      ? await supabase.from("datagtk").update(payload).eq("id", gtkId)
      : await supabase.from("datagtk").insert(payload);

    setSaving(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    router.push("/gtk");
    router.refresh();
  }

  return (
    <div className={`p-6 md:p-8 ${isOwnProfile ? "" : "max-w-5xl mx-auto"}`}>
      <Link
        href="/gtk"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 mb-4"
      >
        <ChevronLeft className="h-4 w-4" />
        Kembali ke Data GTK
      </Link>

      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-6">
        {isEdit ? (
          <>
            Edit Data GTK{" "}
            {initialData?.nama && <span className="text-blue-600">({initialData.nama})</span>}
          </>
        ) : (
          "Tambah GTK Baru"
        )}
      </h1>

      <div className="flex overflow-x-auto border-b border-slate-200 dark:border-slate-700 mb-6 gap-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          const disabled = tab.key === "penugasan" && !isEdit;
          return (
            <button
              type="button"
              key={tab.key}
              onClick={() => !disabled && setActiveTab(tab.key)}
              disabled={disabled}
              title={disabled ? "Simpan data GTK dulu sebelum menambah penugasan mengajar" : undefined}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                disabled
                  ? "border-transparent text-slate-300 cursor-not-allowed"
                  : isActive
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

      {/* Tab Penugasan Mengajar dikelola terpisah (langsung simpan ke DB, bukan lewat form utama) */}
      {activeTab === "penugasan" && isEdit ? (
        <GtkPenugasanTab gtkId={gtkId!} readOnly={!canEdit} />
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <fieldset disabled={isReadOnly} className="contents">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
            {/* TAB 1: Data Pribadi */}
            <div className={activeTab === "pribadi" ? "grid sm:grid-cols-2 gap-5" : "hidden"}>
              <TextField label="Gelar Depan" name="gelar_depan" register={register} placeholder="Dr." />
              <TextField label="Nama Lengkap" name="nama" register={register} required />
              <TextField label="Gelar Belakang" name="gelar_belakang" register={register} placeholder="S.Pd., M.Pd." />
              <TextField label="NUPTK" name="nuptk" register={register} />
              <SelectField label="Jenis Kelamin" name="jk" register={register} options={[{ value: "L", label: "Laki-laki" }, { value: "P", label: "Perempuan" }]} />
              <TextField label="Tempat Lahir" name="tempat_lahir" register={register} />
              <TextField label="Tanggal Lahir" name="tanggal_lahir" type="date" register={register} />
              <SelectField label="Agama" name="agama" register={register} options={AGAMA_OPTIONS_GTK} />
              <TextField label="NIK" name="nik" register={register} />
              <TextField label="No. Kartu Keluarga" name="no_kk" register={register} />
              <TextField label="Kewarganegaraan" name="kewarganegaraan" register={register} placeholder="ID" />
            </div>

            {/* TAB 2: Pendidikan & Sertifikasi */}
            <div className={activeTab === "pendidikan" ? "grid sm:grid-cols-2 gap-5" : "hidden"}>
              <SelectField label="Jenjang Pendidikan Terakhir" name="jenjang_pendidikan" register={register} options={JENJANG_PENDIDIKAN_OPTIONS} />
              <TextField label="Jurusan / Program Studi" name="jurusan_prodi" register={register} />
              <TextField label="Nama Sekolah/PT Sesuai Ijazah" name="nama_sekolah_ijazah" register={register} />
              <TextField label="Nomor Ijazah Terakhir" name="nomor_ijazah_terakhir" register={register} />
              <TextField label="Tanggal Lulus Pendidikan Terakhir" name="tanggal_lulus_pendidikan_terakhir" register={register} placeholder="Contoh: Juli 2015" />
              <TextField label="Mapel Sertifikasi (PPG)" name="mapel_sertifikasi_ppg" register={register} />
              <TextField label="Akun SIM PKB" name="akun_sim_pkb" register={register} />
              <TextField label="Akun Belajar.id" name="akun_belajar" register={register} />
            </div>

            {/* TAB 3: Kepegawaian */}
            <div className={activeTab === "kepegawaian" ? "grid sm:grid-cols-2 gap-5" : "hidden"}>
              <TextField label="NIP" name="nip" register={register} />
              <SelectField label="Status Kepegawaian" name="status_kepegawaian" register={register} options={STATUS_KEPEGAWAIAN_OPTIONS} />
              <SelectField label="Jenis PTK" name="jenis_ptk" register={register} options={JENIS_PTK_OPTIONS} />
              <SelectField label="Jenis PTK Dinas Pendidikan" name="jenis_ptk_pdd" register={register} options={jenisPtkPddOptions} />
              <SelectField label="Status Aktif" name="status_aktif" register={register} options={STATUS_AKTIF_OPTIONS} />

              {statusAktif === "N" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                      Tanggal Mulai Tidak Aktif<span className="text-red-500 ml-0.5">*</span>
                    </label>
                    <input
                      type="date"
                      {...register("tanggal_tidak_aktif")}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                      Alasan Tidak Aktif<span className="text-red-500 ml-0.5">*</span>
                    </label>
                    <textarea
                      rows={3}
                      {...register("alasan_tidak_aktif")}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </>
              )}

              <TextField label="Tugas Tambahan" name="tugas_tambahan" register={register} />
              <TextField label="Golongan" name="golongan" register={register} placeholder="III/a" />
              <TextField label="TMT Kenaikan Pangkat Terakhir" name="tmt_kenaikan_pangkat_terakhir" register={register} />
              <TextField label="Jalur PPPK" name="jalur_pppk" register={register} />
              <TextField label="SK CPNS" name="sk_cpns" register={register} />
              <TextField label="Tanggal CPNS" name="tanggal_cpns" type="date" register={register} />
              <TextField label="SK Pengangkatan" name="sk_pengangkatan" register={register} />
              <TextField label="TMT Pengangkatan" name="tmt_pengangkatan" type="date" register={register} />
              <TextField label="TMT Pengangkatan Awal" name="tmt_pengangkatan_awal" register={register} />
              <TextField label="TMT Awal Jadi Guru/Admin" name="tmt_awal_guru_admin" register={register} />
              <TextField label="TMT Awal di Sekolah Induk" name="tmt_awal_sekolah_induk" register={register} />
              <SelectField label="Lembaga Pengangkatan" name="lembaga_pengangkatan" register={register} options={LEMBAGA_PENGANGKATAN_OPTIONS} />
              <TextField label="Nomor SK Pertama" name="nomor_sk_pertama" register={register} />
              <TextField label="Tanggal SK Pertama" name="tanggal_sk_pertama" register={register} />
              <TextField label="Pejabat TTD SK Pertama" name="pejabat_ttd_sk_pertama" register={register} />
              <SelectField label="Sumber Gaji" name="sumber_gaji" register={register} options={SUMBER_GAJI_OPTIONS} />
              <TextField label="Besaran Gaji Pokok" name="besaran_gaji_pokok" register={register} />
              <TextField label="TMT PNS" name="tmt_pns" type="date" register={register} />
              <SelectField label="Sudah Lisensi Kepala Sekolah" name="lisensi_kepsek" register={register} options={YA_TIDAK_OPTIONS} />
              <SelectField label="Pernah Diklat Kepengawasan" name="diklat_pengawas" register={register} options={YA_TIDAK_OPTIONS} />
              <SelectField label="Keahlian Braille" name="keahlian_braille" register={register} options={YA_TIDAK_OPTIONS} />
              <SelectField label="Keahlian Bahasa Isyarat" name="keahlian_bahasa_isyarat" register={register} options={YA_TIDAK_OPTIONS} />
              <TextField label="Karpeg" name="karpeg" register={register} />
              <TextField label="Karis / Karsu" name="karis_karsu" register={register} />
              <TextField label="NUKS" name="nuks" register={register} />
            </div>

            {/* TAB 4: Keluarga */}
            <div className={activeTab === "keluarga" ? "grid sm:grid-cols-2 gap-5" : "hidden"}>
              <TextField label="Nama Ibu Kandung" name="nama_ibu_kandung" register={register} />
              <SelectField label="Status Perkawinan" name="status_perkawinan" register={register} options={STATUS_PERKAWINAN_OPTIONS} />
              <SelectField label="Suami/Istri" name="status_pasangan" register={register} options={STATUS_PASANGAN_OPTIONS} />
              <TextField label="Jumlah Anak" name="jumlah_anak" register={register} type="number" />
              <TextField label="Nama Suami/Istri" name="nama_suami_istri" register={register} />
              <TextField label="NIP Suami/Istri" name="nip_suami_istri" register={register} />
              <TextField label="Pekerjaan Suami/Istri" name="pekerjaan_suami_istri" register={register} />
            </div>

            {/* TAB 5: Alamat & Kontak */}
            <div className={activeTab === "alamat" ? "grid sm:grid-cols-2 gap-5" : "hidden"}>
              <TextField label="Alamat" name="alamat" register={register} />
              <TextField label="RT" name="rt" register={register} />
              <TextField label="RW" name="rw" register={register} />
              <TextField label="Dusun" name="dusun" register={register} />
              <TextField label="Desa/Kelurahan" name="kelurahan" register={register} />
              <TextField label="Kecamatan" name="kecamatan" register={register} />
              <TextField label="Kode Pos" name="kode_pos" register={register} />
              <TextField label="Telepon" name="telepon" register={register} />
              <TextField label="No. HP" name="hp" register={register} />
              <TextField label="Email" name="email" type="email" register={register} />
              <TextField label="Lintang" name="lintang" register={register} />
              <TextField label="Bujur" name="bujur" register={register} />
            </div>

            {/* TAB 6: Dokumen & Rekening */}
            <div className={activeTab === "dokumen" ? "grid sm:grid-cols-2 gap-5" : "hidden"}>
              <TextField label="NPWP" name="npwp" register={register} />
              <TextField label="Nama Wajib Pajak" name="nama_wajib_pajak" register={register} />
              <TextField label="Bank" name="bank" register={register} />
              <TextField label="No. Rekening" name="no_rekening" register={register} />
              <TextField label="Rekening Atas Nama" name="rekening_atas_nama" register={register} />
              <TextareaField label="Keterangan" name="keterangan" register={register} />
            </div>
          </div>
          </fieldset>

          {isReadOnly && (
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">
              Anda hanya memiliki akses lihat (read-only) untuk data ini.
            </p>
          )}

          {errorMsg && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg px-3 py-2 mt-4">
              {errorMsg}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 mt-6">
            <Link
              href="/gtk"
              className="px-4 py-2.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              {isReadOnly ? "Kembali" : "Batal"}
            </Link>
            {!isReadOnly && (
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white text-sm font-medium px-5 py-2.5 hover:bg-indigo-700 transition-colors disabled:opacity-60"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Simpan Data
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
