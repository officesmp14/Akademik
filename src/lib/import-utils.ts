import { Siswa } from "@/types/siswa";

export type CleanedRow = {
  rowNumber: number; // nomor baris di file Excel (untuk pelaporan)
  data: Record<string, unknown>;
  warnings: string[];
};

/**
 * Fungsi generik: membersihkan satu baris hasil parsing Excel untuk tabel
 * apa pun.
 * - Hanya mengambil kolom yang dikenal (fields)
 * - String kosong -> null
 * - Nilai yang melanggar CHECK constraint (enumRules) -> dikosongkan + warning
 */
export function cleanRowGeneric(
  raw: Record<string, unknown>,
  rowNumber: number,
  fields: string[],
  enumRules: Record<string, string[]>
): CleanedRow {
  const data: Record<string, unknown> = {};
  const warnings: string[] = [];

  for (const field of fields) {
    let value = raw[field];

    if (value === undefined || value === null) {
      continue;
    }

    if (typeof value === "string") {
      value = value.trim();
      if (value === "") continue;
    } else {
      value = String(value).trim();
    }

    const allowed = enumRules[field];
    if (allowed) {
      // Cocokkan tanpa peduli besar-kecil huruf, lalu simpan versi baku
      // (sesuai penulisan resmi di `allowed`) supaya konsisten dengan
      // pilihan dropdown di form.
      const match = allowed.find(
        (opt) => opt.toLowerCase() === (value as string).toLowerCase()
      );
      if (!match) {
        warnings.push(
          `Kolom "${field}" bernilai "${value}" (tidak sesuai pilihan yang diizinkan: ${allowed.join(
            ", "
          )}) — dikosongkan.`
        );
        continue;
      }
      value = match;
    }

    data[field] = value;
  }

  return { rowNumber, data, warnings };
}

// =====================================================================
// KONFIGURASI KHUSUS: SISWA01
// =====================================================================

export const SISWA_FIELDS: (keyof Siswa)[] = [
  "row_index", "tahun_masuk", "semester", "nama", "nipd", "jk", "nisn",
  "tempat_lahir", "tanggal_lahir", "nik", "agama", "anak_ke", "sekolah_asal",
  "kebutuhan_khusus", "alamat", "rt", "rw", "dusun", "kelurahan", "kecamatan",
  "kode_pos", "jenis_tinggal", "alat_transportasi", "lintang", "bujur",
  "jarak_rumah", "jarak_tempuh", "telepon", "hp", "email", "nama_ayah",
  "ayah_tahun_lahir", "ayah_nik", "ayah_pendidikan", "ayah_pekerjaan",
  "ayah_penghasilan", "nama_ibu", "ibu_tahun_lahir", "ibu_nik",
  "ibu_pendidikan", "ibu_pekerjaan", "ibu_penghasilan", "nama_wali",
  "wali_tahun_lahir", "wali_nik", "wali_pendidikan", "wali_pekerjaan",
  "wali_penghasilan", "rombel", "no_peserta_un", "no_seri_ijazah", "skhun",
  "penerima_kps", "no_kps", "penerima_kip", "nomor_kip", "nama_kip",
  "nomor_kks", "layak_pip", "alasan_pip", "no_akta_lahir", "no_kk", "bank",
  "no_rekening", "rekening_atas_nama", "berat_badan", "tinggi_badan",
  "lingkar_kepala", "jml_saudara", "jalur", "status_siswa",
];

const SISWA_ENUM_RULES: Record<string, string[]> = {
  jk: ["L", "P"],
  penerima_kps: ["Ya", "Tidak"],
  penerima_kip: ["Ya", "Tidak"],
  layak_pip: ["Ya", "Tidak"],
  kebutuhan_khusus: [
    "Tidak Ada", "Netra (A)", "Rungu (B)", "Grahita Ringan (C)",
    "Grahita Sedang (C1)", "Daksa Ringan (D)", "Daksa Sedang (D1)",
    "Laras (E)", "Wicara (F)", "Hyperaktif (H)", "Cerdas Istimewa (I)",
    "Bakat Istimewa (J)", "Kesulitan Belajar (K)", "Narkoba (N)",
    "Indigo (O)", "Down Syndrome (P)", "Autis (Q)",
  ],
  status_siswa: ["Aktif", "Mutasi", "Alumni", "Berhenti"],
};

export function cleanRow(
  raw: Record<string, unknown>,
  rowNumber: number
): CleanedRow {
  return cleanRowGeneric(raw, rowNumber, SISWA_FIELDS as string[], SISWA_ENUM_RULES);
}
