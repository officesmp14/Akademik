import { Gtk, GtkPenugasanMengajar } from "@/types/gtk";
import { cleanRowGeneric, CleanedRow } from "@/lib/import-utils";

export const GTK_FIELDS: (keyof Gtk)[] = [
  "row_index", "nama", "nuptk", "jk", "tempat_lahir", "tanggal_lahir", "nip",
  "status_kepegawaian", "jenis_ptk", "agama", "alamat", "rt", "rw", "dusun",
  "kelurahan", "kecamatan", "kode_pos", "telepon", "hp", "email",
  "tugas_tambahan", "sk_cpns", "tanggal_cpns", "sk_pengangkatan",
  "tmt_pengangkatan", "lembaga_pengangkatan",
  "sumber_gaji", "nama_ibu_kandung", "status_perkawinan", "nama_suami_istri",
  "nip_suami_istri", "pekerjaan_suami_istri", "tmt_pns", "lisensi_kepsek",
  "diklat_pengawas", "keahlian_braille", "keahlian_bahasa_isyarat", "npwp",
  "nama_wajib_pajak", "kewarganegaraan", "bank", "no_rekening",
  "rekening_atas_nama", "nik", "no_kk", "karpeg", "karis_karsu", "lintang",
  "bujur", "nuks",
  "gelar_depan", "gelar_belakang", "jenjang_pendidikan", "jurusan_prodi",
  "mapel_sertifikasi_ppg", "tmt_pengangkatan_awal", "besaran_gaji_pokok",
  "status_pasangan", "jumlah_anak", "golongan", "tmt_kenaikan_pangkat_terakhir",
  "tmt_awal_guru_admin", "tmt_awal_sekolah_induk", "status_aktif",
  "nomor_ijazah_terakhir", "nama_sekolah_ijazah",
  "tanggal_lulus_pendidikan_terakhir", "nomor_sk_pertama",
  "tanggal_sk_pertama", "pejabat_ttd_sk_pertama", "jalur_pppk",
  "akun_sim_pkb", "akun_belajar", "keterangan",
];

// Header versi Excel Dapodik/GTK biasanya pakai spasi & huruf kapital,
// bukan snake_case. Peta ini menerjemahkan header Excel -> nama kolom DB.
// Ini juga mencakup format "Master Update" Dinas Pendidikan.
export const GTK_HEADER_MAP: Record<string, keyof Gtk> = {
  "No": "row_index",
  "NO": "row_index",
  "Nama": "nama",
  "NAMA": "nama",
  "NUPTK": "nuptk",
  "JK": "jk",
  "Tempat Lahir": "tempat_lahir",
  "TEMPAT LAHIR": "tempat_lahir",
  "Tanggal Lahir": "tanggal_lahir",
  "TANGGAL LAHIR": "tanggal_lahir",
  "NIP": "nip",
  "Status Kepegawaian": "status_kepegawaian",
  "STATUS KEPEGAWAIAN": "status_kepegawaian",
  "Jenis PTK": "jenis_ptk",
  "JENIS PTK": "jenis_ptk",
  "Agama": "agama",
  "AGAMA": "agama",
  "Alamat Jalan": "alamat",
  "ALAMAT": "alamat",
  "RT": "rt",
  "RW": "rw",
  "Nama Dusun": "dusun",
  "Desa/Kelurahan": "kelurahan",
  "KELURAHAN": "kelurahan",
  "Kecamatan": "kecamatan",
  "Kode Pos": "kode_pos",
  "Telepon": "telepon",
  "HP": "hp",
  "HP/WA": "hp",
  "Email": "email",
  "Tugas Tambahan": "tugas_tambahan",
  "TUGAS TAMBAHAN": "tugas_tambahan",
  "SK CPNS": "sk_cpns",
  "Tanggal CPNS": "tanggal_cpns",
  "SK Pengangkatan": "sk_pengangkatan",
  "TMT Pengangkatan": "tmt_pengangkatan",
  "Lembaga Pengangkatan": "lembaga_pengangkatan",
  "Pangkat Golongan": "golongan",
  "Sumber Gaji": "sumber_gaji",
  "SUMBER GAJI": "sumber_gaji",
  "Nama Ibu Kandung": "nama_ibu_kandung",
  "Status Perkawinan": "status_perkawinan",
  "Nama Suami/Istri": "nama_suami_istri",
  "NIP Suami/Istri": "nip_suami_istri",
  "Pekerjaan Suami/Istri": "pekerjaan_suami_istri",
  "PEKERJAAN SUAMI / ISTRI (PNS/PPPK/TNI/POLRI/LAINNYA)": "pekerjaan_suami_istri",
  "TMT PNS": "tmt_pns",
  "Sudah Lisensi Kepala Sekolah": "lisensi_kepsek",
  "Pernah Diklat Kepengawasan": "diklat_pengawas",
  "Keahlian Braille": "keahlian_braille",
  "Keahlian Bahasa Isyarat": "keahlian_bahasa_isyarat",
  "NPWP": "npwp",
  "Nama Wajib Pajak": "nama_wajib_pajak",
  "Kewarganegaraan": "kewarganegaraan",
  "Bank": "bank",
  "Nomor Rekening Bank": "no_rekening",
  "Rekening Atas Nama": "rekening_atas_nama",
  "NIK": "nik",
  "No KK": "no_kk",
  "NOMOR KARTU KELUARGA (KK)": "no_kk",
  "Karpeg": "karpeg",
  "Karis/Karsu": "karis_karsu",
  "Lintang": "lintang",
  "Bujur": "bujur",
  "NUKS": "nuks",
  // Field baru khusus format "Master Update" Dinas Pendidikan
  "GELAR DEPAN": "gelar_depan",
  "GELAR BELAKANG": "gelar_belakang",
  "JENJANG": "jenjang_pendidikan", // header pertama "JENJANG" (jenjang pendidikan)
  "JURUSAN/PRODI": "jurusan_prodi",
  "MAPEL SERTIFIKASI (PPG)": "mapel_sertifikasi_ppg",
  "TMT PENGANGKATAN AWAL": "tmt_pengangkatan_awal",
  "BESARAN GAJI POKOK": "besaran_gaji_pokok",
  "SUAMI/ISTRI (ADA/TIDAK)": "status_pasangan",
  "JUMLAH ANAK": "jumlah_anak",
  "GOLONGAN": "golongan",
  "TMT KENAIKAN PANGKAT TERAKHIR": "tmt_kenaikan_pangkat_terakhir",
  "TMT AWAL JADI GURU/ADMIN": "tmt_awal_guru_admin",
  "TMT AWAL SEKOLAH INDUK": "tmt_awal_sekolah_induk",
  "NOMOR IJAZAH TERAKHIR": "nomor_ijazah_terakhir",
  "NAMA SEKOLAH/PT SESUAI IJAZAH ": "nama_sekolah_ijazah", // ada spasi di akhir pada file asli
  "TGL, BULAN, TAHUN LULUS PENDIDIKAN TERAKHIR": "tanggal_lulus_pendidikan_terakhir",
  "NOMOR SK PERTAMA": "nomor_sk_pertama",
  "TGL, BULAN TAHUN SK PERTAMA": "tanggal_sk_pertama",
  "PEJABAT TTD SK PERTAMA": "pejabat_ttd_sk_pertama",
  "JALUR PPPK": "jalur_pppk",
  "AKUN SIM PKB": "akun_sim_pkb",
  "AKUN BELAJAR": "akun_belajar",
  "KERERANGAN": "keterangan", // typo di file asli Dinas, tetap dipetakan
  "KETERANGAN": "keterangan",
};

// Kolom penugasan mengajar (bisa lebih dari 1 baris per guru) -> tabel
// gtk_penugasan_mengajar. Header "JENJANG" kedua otomatis jadi "JENJANG_1"
// oleh SheetJS karena ada 2 kolom dengan nama sama di file Excel.
export const GTK_PENUGASAN_HEADER_MAP: Record<string, keyof GtkPenugasanMengajar> = {
  "SEKOLAH": "nama_sekolah",
  "JENJANG_1": "jenjang_sekolah",
  "STATUS": "status_sekolah",
  "KECAMATAN SEKOLAH": "kecamatan_sekolah",
  "MENGAJAR": "mengajar",
  "KOMPETENSI": "kompetensi",
  "JAM TUGAS TAMBAHAN": "jam_tugas_tambahan",
  "JJM": "jjm",
  "SISWA": "jumlah_siswa_diajar",
};

const GTK_ENUM_RULES: Record<string, string[]> = {
  jk: ["L", "P"],
  status_perkawinan: ["Belum Kawin", "Kawin", "Cerai Hidup", "Cerai Mati"],
  lisensi_kepsek: ["Ya", "Tidak"],
  diklat_pengawas: ["Ya", "Tidak"],
  keahlian_braille: ["Ya", "Tidak"],
  keahlian_bahasa_isyarat: ["Ya", "Tidak"],
  status_pasangan: ["Ada", "Tidak", "Janda/Duda"],
};

/** Mengubah 1 baris mentah (header versi Excel) jadi objek dengan key kolom DB. */
export function mapExcelRowToGtk(
  raw: Record<string, unknown>
): Record<string, unknown> {
  const mapped: Record<string, unknown> = {};
  for (const [excelHeader, dbField] of Object.entries(GTK_HEADER_MAP)) {
    if (excelHeader in raw) {
      mapped[dbField] = raw[excelHeader];
    }
  }
  return mapped;
}

export function cleanGtkRow(
  raw: Record<string, unknown>,
  rowNumber: number
): CleanedRow {
  const mapped = mapExcelRowToGtk(raw);
  return cleanRowGeneric(mapped, rowNumber, GTK_FIELDS as string[], GTK_ENUM_RULES);
}

/**
 * Ekstrak data penugasan mengajar dari 1 baris Excel. Hasilnya BELUM
 * termasuk gtk_id (diisi setelah data personalnya berhasil di-upsert dan
 * kita tahu id-nya).
 */
export function extractPenugasanFromRow(
  raw: Record<string, unknown>
): Partial<GtkPenugasanMengajar> | null {
  const result: Record<string, unknown> = {};

  for (const [excelHeader, dbField] of Object.entries(GTK_PENUGASAN_HEADER_MAP)) {
    if (excelHeader in raw) {
      let value = raw[excelHeader];
      if (typeof value === "string") value = value.trim();
      if (value !== null && value !== undefined && value !== "") {
        result[dbField] = value;
      }
    }
  }

  // Kalau tidak ada satupun data penugasan yang terisi (mis. kolom
  // MENGAJAR/SEKOLAH kosong semua), tidak perlu bikin baris penugasan.
  if (Object.keys(result).length === 0) return null;

  return result as Partial<GtkPenugasanMengajar>;
}
