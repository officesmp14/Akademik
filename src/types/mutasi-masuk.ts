export type StatusMutasiMasuk = "Diajukan" | "Diterima" | "Ditolak";

export interface SiswaMutasiMasuk {
  id: string;
  nama_siswa: string;
  nisn: string | null;
  asal_provinsi: string | null;
  asal_kab_kota: string | null;
  asal_kecamatan: string | null;
  asal_npsn_sekolah: string | null;
  asal_nama_sekolah: string | null;
  kelas_tujuan: string | null;
  dok_kk: string | null;
  dok_rekomendasi: string | null;
  dok_surat_keterangan_pindah: string | null;
  dok_legalisir_ijazah_sd: string | null;
  dok_akte_kelahiran: string | null;
  status: StatusMutasiMasuk;
  keterangan: string | null;
  siswa_id: string | null;
  created_at?: string;
}

export const DOKUMEN_MUTASI_MASUK_FIELDS: {
  key: keyof Pick<
    SiswaMutasiMasuk,
    "dok_kk" | "dok_rekomendasi" | "dok_surat_keterangan_pindah" | "dok_legalisir_ijazah_sd" | "dok_akte_kelahiran"
  >;
  label: string;
}[] = [
  { key: "dok_kk", label: "Kartu Keluarga (KK)" },
  { key: "dok_rekomendasi", label: "Rekomendasi" },
  { key: "dok_surat_keterangan_pindah", label: "Surat Keterangan Pindah Sekolah" },
  { key: "dok_legalisir_ijazah_sd", label: "Legalisir Ijazah SD" },
  { key: "dok_akte_kelahiran", label: "Akte Kelahiran" },
];

export const MUTASI_MASUK_STORAGE_BUCKET = "dokumen-mutasi-masuk";
