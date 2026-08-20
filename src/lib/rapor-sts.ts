/** Keterangan huruf berdasarkan rentang skor TETAP (sama untuk semua mapel). */
export function getKeterangan(nilai: number): "A" | "B" | "C" | "D" {
  if (nilai >= 88) return "A";
  if (nilai >= 74) return "B";
  if (nilai >= 60) return "C";
  return "D";
}

/** Fase Kurikulum Merdeka -- untuk SMP (kelas VII-IX) selalu Fase D. */
export function getFase(_rombel: string): string {
  return "D";
}

/** Format tanggal Indonesia, mis. "04 April 2026". */
export function formatTanggalIndonesia(date: Date = new Date()): string {
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
}
