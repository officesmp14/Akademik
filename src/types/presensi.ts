export type StatusPresensi = "H" | "S" | "I" | "L" | "M" | "A" | "P" | "G" | "D";

export interface Presensi {
  id?: string;
  siswa_id: string;
  gtk_id: string;
  mapel_id: number;
  rombel: string;
  tanggal: string;
  jam_ke: number;
  status: StatusPresensi;
  keterangan?: string | null;
  tahun_ajaran: string;
  semester: "Ganjil" | "Genap";
  created_at?: string | null;
  updated_at?: string | null;
}

export const JAM_KE_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8];

export const STATUS_PRESENSI_OPTIONS: { value: StatusPresensi; label: string }[] = [
  { value: "H", label: "Hadir" },
  { value: "S", label: "Sakit" },
  { value: "I", label: "Izin" },
  { value: "L", label: "Terlambat" },
  { value: "M", label: "Minggat / Tidak Masuk Kelas" },
  { value: "A", label: "Alpa" },
  { value: "P", label: "Pulang" },
  { value: "G", label: "Dipanggil Guru" },
  { value: "D", label: "Dispen" },
];

export const STATUS_PRESENSI_LABEL: Record<StatusPresensi, string> = Object.fromEntries(
  STATUS_PRESENSI_OPTIONS.map((s) => [s.value, s.label])
) as Record<StatusPresensi, string>;
