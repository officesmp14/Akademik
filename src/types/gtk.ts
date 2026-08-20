export interface Gtk {
  id?: string;
  row_index?: number | null;
  nama?: string | null;
  nuptk?: string | null;
  jk?: "L" | "P" | null;
  tempat_lahir?: string | null;
  tanggal_lahir?: string | null;
  nip?: string | null;
  status_kepegawaian?: string | null;
  jenis_ptk?: string | null;
  jenis_ptk_pdd?: string | null;
  agama?: string | null;
  alamat?: string | null;
  rt?: string | null;
  rw?: string | null;
  dusun?: string | null;
  kelurahan?: string | null;
  kecamatan?: string | null;
  kode_pos?: string | null;
  telepon?: string | null;
  hp?: string | null;
  email?: string | null;
  tugas_tambahan?: string | null;
  sk_cpns?: string | null;
  tanggal_cpns?: string | null;
  sk_pengangkatan?: string | null;
  tmt_pengangkatan?: string | null;
  lembaga_pengangkatan?: string | null;
  sumber_gaji?: string | null;
  nama_ibu_kandung?: string | null;
  status_perkawinan?: string | null;
  nama_suami_istri?: string | null;
  nip_suami_istri?: string | null;
  pekerjaan_suami_istri?: string | null;
  tmt_pns?: string | null;
  lisensi_kepsek?: string | null;
  diklat_pengawas?: string | null;
  keahlian_braille?: string | null;
  keahlian_bahasa_isyarat?: string | null;
  npwp?: string | null;
  nama_wajib_pajak?: string | null;
  kewarganegaraan?: string | null;
  bank?: string | null;
  no_rekening?: string | null;
  rekening_atas_nama?: string | null;
  nik?: string | null;
  no_kk?: string | null;
  karpeg?: string | null;
  karis_karsu?: string | null;
  lintang?: string | null;
  bujur?: string | null;
  nuks?: string | null;
  gelar_depan?: string | null;
  gelar_belakang?: string | null;
  jenjang_pendidikan?: string | null;
  jurusan_prodi?: string | null;
  mapel_sertifikasi_ppg?: string | null;
  tmt_pengangkatan_awal?: string | null;
  besaran_gaji_pokok?: string | null;
  status_pasangan?: string | null;
  jumlah_anak?: string | null;
  golongan?: string | null;
  tmt_kenaikan_pangkat_terakhir?: string | null;
  tmt_awal_guru_admin?: string | null;
  tmt_awal_sekolah_induk?: string | null;
  status_aktif?: string | null;
  tanggal_tidak_aktif?: string | null;
  alasan_tidak_aktif?: string | null;
  nomor_ijazah_terakhir?: string | null;
  nama_sekolah_ijazah?: string | null;
  tanggal_lulus_pendidikan_terakhir?: string | null;
  nomor_sk_pertama?: string | null;
  tanggal_sk_pertama?: string | null;
  pejabat_ttd_sk_pertama?: string | null;
  jalur_pppk?: string | null;
  akun_sim_pkb?: string | null;
  akun_belajar?: string | null;
  keterangan?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface GtkPenugasanMengajar {
  id?: string;
  gtk_id: string;
  nama_sekolah?: string | null;
  jenjang_sekolah?: string | null;
  status_sekolah?: string | null;
  kecamatan_sekolah?: string | null;
  mengajar?: string | null;
  kompetensi?: string | null;
  jam_tugas_tambahan?: string | null;
  jjm?: string | null;
  jumlah_siswa_diajar?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export const STATUS_SEKOLAH_OPTIONS = ["Negeri", "Swasta"];

export const JENIS_PTK_OPTIONS = ["Guru", "Kepala Sekolah", "Tenaga Kependidikan"];

export const STATUS_KEPEGAWAIAN_OPTIONS = [
  "PNS",
  "PPPK",
  "Guru Honor Sekolah",
  "Tenaga Honor Sekolah",
];

export const AGAMA_OPTIONS_GTK = [
  "Islam",
  "Kristen",
  "Katolik",
  "Hindu",
  "Buddha",
  "Konghucu",
  "Lainnya",
];

export const STATUS_PERKAWINAN_OPTIONS = [
  "Belum Kawin",
  "Kawin",
  "Cerai Hidup",
  "Cerai Mati",
];

export const YA_TIDAK_OPTIONS = ["Ya", "Tidak"];

export const LEMBAGA_PENGANGKATAN_OPTIONS = [
  "Pemerintah Pusat",
  "Pemerintah Propinsi",
  "Pemerintah Kab/Kota",
  "Kepala Sekolah",
  "Yayasan",
];

export const SUMBER_GAJI_OPTIONS = [
  "APBN",
  "APBD Propinsi",
  "APBD Kabupaten/Kota",
  "Sekolah",
  "Yayasan",
];

// Kolom datagtk.status_aktif bertipe varchar(1) di database, jadi
// Kolom status_aktif punya CHECK constraint di database yang cuma
// mengizinkan 'Y' atau 'N' (bukan 'T').
export const STATUS_AKTIF_OPTIONS = [
  { value: "Y", label: "Aktif" },
  { value: "N", label: "Tidak Aktif" },
];

export const STATUS_PASANGAN_OPTIONS = ["Ada", "Tidak", "Janda/Duda"];

export const JENJANG_PENDIDIKAN_OPTIONS = [
  "SMA / Sederajat", "D1", "D2", "D3", "D4", "S1", "S2", "S3",
];

export const JENJANG_SEKOLAH_OPTIONS = ["TK", "SD", "SMP", "SMA", "SMK", "SLB"];
