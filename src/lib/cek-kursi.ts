import { compareKelas } from "@/lib/rekap-siswa";

export const KAPASITAS_KELAS = 32;

export type CekKursiRow = {
  kelas: string;
  jumlahSiswa: number;
  keterangan: string;
  status: "penuh" | "kurang" | "lebih";
};

export function buildCekKursi(rombelList: (string | null)[]): CekKursiRow[] {
  const map = new Map<string, number>();

  for (const r of rombelList) {
    const kelas = r?.trim() || "Tanpa Rombel";
    map.set(kelas, (map.get(kelas) ?? 0) + 1);
  }

  const rows: CekKursiRow[] = Array.from(map.entries()).map(([kelas, jumlahSiswa]) => {
    const sisa = KAPASITAS_KELAS - jumlahSiswa;

    if (sisa === 0) {
      return { kelas, jumlahSiswa, keterangan: "Kelas penuh", status: "penuh" };
    }
    if (sisa > 0) {
      return {
        kelas,
        jumlahSiswa,
        keterangan: `Masih ada slot ${sisa} kursi`,
        status: "kurang",
      };
    }
    return {
      kelas,
      jumlahSiswa,
      keterangan: `Kelebihan ${Math.abs(sisa)} siswa dari kapasitas`,
      status: "lebih",
    };
  });

  return rows.sort((a, b) => compareKelas(a.kelas, b.kelas));
}
