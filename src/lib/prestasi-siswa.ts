// Pilihan tetap untuk catatan Prestasi Siswa -- dibuat pilihan (bukan teks
// bebas) supaya nanti bisa direkap: "berapa juara 1 tingkat kota".

export const BIDANG_OPTIONS = ["Akademik", "Non Akademik"] as const;

export const TINGKAT_OPTIONS = ["Sekolah", "Kecamatan", "Kota", "Provinsi", "Nasional", "Internasional"] as const;

export const JENIS_OPTIONS = ["Individu", "Tim/Kelompok"] as const;

export const PERINGKAT_OPTIONS = [
  "Juara 1",
  "Juara 2",
  "Juara 3",
  "Harapan 1",
  "Harapan 2",
  "Harapan 3",
  "Medali Emas",
  "Medali Perak",
  "Medali Perunggu",
  "Finalis",
  "Peserta",
] as const;

export type PrestasiSiswa = {
  id: string;
  siswa_id: string;
  tahun_ajaran: string;
  bidang: string;
  cabang: string | null;
  nama_kegiatan: string;
  tingkat: string;
  jenis: string;
  peringkat: string;
  penyelenggara: string | null;
  tanggal: string | null;
  bukti_url: string | null;
  keterangan: string | null;
  siswa01: { nama: string | null; nisn: string | null; rombel: string | null } | null;
};
