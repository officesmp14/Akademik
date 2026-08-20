export type UjianStatus = "draft" | "terbit" | "arsip";
export type SoalTipe = "pilihan_ganda" | "esai";
export type SesiStatus = "tertutup" | "dibuka" | "ditutup";
export type PesertaStatus = "belum_mulai" | "mengerjakan" | "selesai" | "digugurkan";
export type PelanggaranTipe =
  | "keluar_fullscreen"
  | "tab_switch"
  | "blur"
  | "copy_paste"
  | "devtools"
  | "lainnya";

export interface SoalOpsi {
  key: string;
  teks: string;
}

export interface Ujian {
  id: string;
  judul: string;
  mapel: string | null;
  durasi_menit: number;
  acak_soal: boolean;
  status: UjianStatus;
  dibuat_oleh: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface UjianSoal {
  id: string;
  ujian_id: string;
  urutan: number;
  tipe: SoalTipe;
  pertanyaan: string;
  opsi: SoalOpsi[] | null;
  kunci_jawaban: string | null;
  bobot: number;
  created_at?: string | null;
}

export interface UjianSesi {
  id: string;
  ujian_id: string;
  kode_sesi: string;
  rombel: string | null;
  status: SesiStatus;
  dibuka_pada: string | null;
  ditutup_pada: string | null;
  created_at?: string | null;
}

export interface UjianPeserta {
  id: string;
  sesi_id: string;
  siswa_id: string | null;
  nisn: string;
  nama_siswa: string;
  status: PesertaStatus;
  jumlah_pelanggaran: number;
  waktu_mulai: string | null;
  waktu_selesai: string | null;
  nilai_pg: number | null;
  nilai_esai: number | null;
  created_at?: string | null;
}

export interface UjianJawaban {
  id: string;
  peserta_id: string;
  soal_id: string;
  jawaban_pg: string | null;
  jawaban_esai: string | null;
  is_benar: boolean | null;
  nilai_esai: number | null;
  updated_at?: string | null;
}

export interface UjianPelanggaran {
  id: string;
  peserta_id: string;
  tipe: PelanggaranTipe;
  detail: string | null;
  created_at?: string | null;
}

export const PELANGGARAN_LABEL: Record<PelanggaranTipe, string> = {
  keluar_fullscreen: "Keluar layar penuh",
  tab_switch: "Pindah tab/aplikasi",
  blur: "Jendela kehilangan fokus",
  copy_paste: "Copy/paste",
  devtools: "Percobaan buka DevTools",
  lainnya: "Lainnya",
};

export const OPSI_HURUF = ["A", "B", "C", "D", "E"];
