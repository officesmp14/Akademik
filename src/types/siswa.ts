export interface Siswa {
  id?: string;
  row_index?: number | null;
  tahun_masuk?: string | null;
  semester?: string | null;
  nama?: string | null;
  nipd?: string | null;
  jk?: "L" | "P" | null;
  nisn?: string | null;
  tempat_lahir?: string | null;
  tanggal_lahir?: string | null;
  nik?: string | null;
  agama?: string | null;
  anak_ke?: string | null;
  sekolah_asal?: string | null;
  kebutuhan_khusus?: string | null;
  id_hobby?: number | null;
  id_cita?: number | null;
  alamat?: string | null;
  rt?: string | null;
  rw?: string | null;
  dusun?: string | null;
  kelurahan?: string | null;
  kecamatan?: string | null;
  kode_pos?: string | null;
  jenis_tinggal?: string | null;
  alat_transportasi?: string | null;
  lintang?: string | null;
  bujur?: string | null;
  jarak_rumah?: string | null;
  jarak_rumah_km?: string | null;
  jarak_tempuh?: string | null;
  jarak_tempuh_jam?: string | null;
  telepon?: string | null;
  hp?: string | null;
  email?: string | null;
  nama_ayah?: string | null;
  ayah_tahun_lahir?: string | null;
  ayah_nik?: string | null;
  ayah_pendidikan?: string | null;
  ayah_pekerjaan?: string | null;
  ayah_penghasilan?: string | null;
  nama_ibu?: string | null;
  ibu_tahun_lahir?: string | null;
  ibu_nik?: string | null;
  ibu_pendidikan?: string | null;
  ibu_pekerjaan?: string | null;
  ibu_penghasilan?: string | null;
  nama_wali?: string | null;
  wali_tahun_lahir?: string | null;
  wali_nik?: string | null;
  wali_pendidikan?: string | null;
  wali_pekerjaan?: string | null;
  wali_penghasilan?: string | null;
  rombel?: string | null;
  no_peserta_un?: string | null;
  no_seri_ijazah?: string | null;
  skhun?: string | null;
  penerima_kps?: "Ya" | "Tidak" | null;
  no_kps?: string | null;
  penerima_kip?: "Ya" | "Tidak" | null;
  nomor_kip?: string | null;
  nama_kip?: string | null;
  nomor_kks?: string | null;
  layak_pip?: "Ya" | "Tidak" | null;
  alasan_pip?: string | null;
  no_akta_lahir?: string | null;
  no_kk?: string | null;
  bank?: string | null;
  no_rekening?: string | null;
  rekening_atas_nama?: string | null;
  berat_badan?: string | null;
  tinggi_badan?: string | null;
  lingkar_kepala?: string | null;
  jml_saudara?: string | null;
  jalur?: string | null;
  jenis_pendaftaran_id?: number | null;
  tanggal_masuk_sekolah?: string | null;
  status_siswa?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  updated_by?: string | null;
  updated_by_nama?: string | null;
}

export const STATUS_SISWA_OPTIONS = ["Aktif", "Mutasi", "Alumni", "Berhenti"];

export const YA_TIDAK_OPTIONS = [
  { value: "Ya", label: "Ya" },
  { value: "Tidak", label: "Tidak" },
];

export const KEBUTUHAN_KHUSUS_OPTIONS = [
  "Tidak Ada",
  "Netra (A)",
  "Rungu (B)",
  "Grahita Ringan (C)",
  "Grahita Sedang (C1)",
  "Daksa Ringan (D)",
  "Daksa Sedang (D1)",
  "Laras (E)",
  "Wicara (F)",
  "Hyperaktif (H)",
  "Cerdas Istimewa (I)",
  "Bakat Istimewa (J)",
  "Kesulitan Belajar (K)",
  "Narkoba (N)",
  "Indigo (O)",
  "Down Syndrome (P)",
  "Autis (Q)",
];
