export type ReferensiConfig = {
  slug: string;
  table: string;
  label: string;
  description: string;
};

export const REFERENSI_TABLES: ReferensiConfig[] = [
  {
    slug: "cita-cita",
    table: "ref_cita_cita",
    label: "Cita-cita",
    description: "Kode & uraian cita-cita siswa",
  },
  {
    slug: "hobi",
    table: "ref_hobi",
    label: "Hobi",
    description: "Kode & uraian hobi siswa",
  },
  {
    slug: "penghasilan",
    table: "ref_penghasilan",
    label: "Penghasilan",
    description: "Kode & uraian rentang penghasilan orang tua/wali",
  },
  {
    slug: "pekerjaan",
    table: "ref_pekerjaan",
    label: "Pekerjaan",
    description: "Kode & uraian pekerjaan orang tua/wali",
  },
  {
    slug: "jenjang-pendidikan",
    table: "ref_jenjang_pendidikan",
    label: "Jenjang Pendidikan",
    description: "Kode & uraian jenjang pendidikan orang tua/wali",
  },
  {
    slug: "moda-transportasi",
    table: "ref_moda_transportasi",
    label: "Moda Transportasi",
    description: "Kode & uraian alat transportasi siswa ke sekolah",
  },
  {
    slug: "jenis-tinggal",
    table: "ref_jenis_tinggal",
    label: "Jenis Tinggal",
    description: "Kode & uraian jenis tempat tinggal siswa",
  },
  {
    slug: "agama",
    table: "ref_agama",
    label: "Agama",
    description: "Kode & uraian agama",
  },
  {
    slug: "jalur-daftar",
    table: "ref_jalur_daftar",
    label: "Jalur Masuk",
    description: "Kode & uraian jalur pendaftaran/masuk siswa",
  },
  {
    slug: "jenis-pendaftaran",
    table: "ref_jenis_pendaftaran",
    label: "Jenis Pendaftaran",
    description: "Kode & uraian jenis pendaftaran siswa",
  },
  {
    slug: "jenisptk-dinaspdd",
    table: "ref_jenisptk_dinaspdd",
    label: "Jenis PTK Dinas Pendidikan",
    description: "Kode & uraian jenis PTK sesuai referensi Dinas Pendidikan",
  },
];

export function getReferensiConfig(slug: string): ReferensiConfig | undefined {
  return REFERENSI_TABLES.find((r) => r.slug === slug);
}
