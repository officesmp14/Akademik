export interface SiswaMutasiKeluar {
  id?: string;
  siswa_id: string;
  tanggal_mutasi?: string | null;
  alasan_mutasi?: string | null;
  sekolah_tujuan?: string | null;
  alamat_sekolah_tujuan?: string | null;
}
