// Tahun ajaran "2025/2026" -> "2026" (tahun kedua) dipakai sebagai tahun
// di akhir Nomor Unik SKL. Fallback ke input asli kalau formatnya tak
// sesuai (mis. sudah berupa satu tahun tunggal).
export function getTahunAkhir(tahunAjaran: string): string {
  const parts = tahunAjaran.split("/");
  return parts.length === 2 ? parts[1] : tahunAjaran;
}

export function formatNomorUnikSkl(
  kodeKlasifikasi: string,
  nomorUnik: number,
  kodeSekolah: string,
  tahunAjaran: string
): string {
  return `${kodeKlasifikasi}/${nomorUnik}/${kodeSekolah}/${getTahunAkhir(tahunAjaran)}`;
}
