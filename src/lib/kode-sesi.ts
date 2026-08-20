const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // tanpa 0/O/1/I/L supaya tidak rancu saat ditulis di papan tulis

/** Kode sesi ujian yang mudah dibacakan/ditulis siswa di HP. */
export function generateKodeSesi(length = 6): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return result;
}
