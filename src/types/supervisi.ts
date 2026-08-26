export type StatusSupervisi = "Direncanakan" | "Terlaksana" | "Dibatalkan";

export interface JadwalSupervisi {
  id: string;
  gtk_id: string;
  tanggal: string;
  rombel: string;
  jam_ke: number;
  status: StatusSupervisi;
  tahun: number;
  deskripsi_pokok_bahasan: string | null;
  link_dokumen: string | null;
}

export const STATUS_SUPERVISI_OPTIONS: { value: StatusSupervisi; label: string }[] = [
  { value: "Direncanakan", label: "Direncanakan" },
  { value: "Terlaksana", label: "Terlaksana" },
  { value: "Dibatalkan", label: "Dibatalkan" },
];

export const STATUS_SUPERVISI_COLOR: Record<StatusSupervisi, string> = {
  Direncanakan: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400",
  Terlaksana: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  Dibatalkan: "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400",
};
