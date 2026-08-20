import { Gtk, GtkPenugasanMengajar } from "@/types/gtk";

export type LaporanDinasRow = {
  gtk: Gtk;
  penugasan: GtkPenugasanMengajar | null;
  totalJjm: number;
};

function v(value: string | null | undefined): string {
  return value ?? "";
}

// Urutan & label kolom PERSIS mengikuti file "Master Update" Dinas Pendidikan.
export const LAPORAN_DINAS_COLUMNS: {
  header: string;
  get: (row: LaporanDinasRow) => string | number;
}[] = [
  { header: "NAMA", get: (r) => v(r.gtk.nama) },
  { header: "NUPTK", get: (r) => v(r.gtk.nuptk) },
  { header: "JK", get: (r) => v(r.gtk.jk) },
  { header: "TEMPAT LAHIR", get: (r) => v(r.gtk.tempat_lahir) },
  { header: "TANGGAL LAHIR", get: (r) => v(r.gtk.tanggal_lahir) },
  { header: "AGAMA", get: (r) => v(r.gtk.agama) },
  { header: "NIP", get: (r) => v(r.gtk.nip) },
  { header: "STATUS KEPEGAWAIAN", get: (r) => v(r.gtk.status_kepegawaian) },
  { header: "JENIS PTK", get: (r) => v(r.gtk.jenis_ptk_pdd) },
  { header: "GELAR DEPAN", get: (r) => v(r.gtk.gelar_depan) },
  { header: "GELAR BELAKANG", get: (r) => v(r.gtk.gelar_belakang) },
  { header: "JENJANG", get: (r) => v(r.gtk.jenjang_pendidikan) },
  { header: "JURUSAN/PRODI", get: (r) => v(r.gtk.jurusan_prodi) },
  { header: "MAPEL SERTIFIKASI (PPG)", get: (r) => v(r.gtk.mapel_sertifikasi_ppg) },
  { header: "TMT PENGANGKATAN AWAL", get: (r) => v(r.gtk.tmt_pengangkatan_awal) },
  { header: "TUGAS TAMBAHAN", get: (r) => v(r.gtk.tugas_tambahan) },
  { header: "MENGAJAR", get: (r) => v(r.penugasan?.mengajar) },
  { header: "JAM TUGAS TAMBAHAN", get: (r) => v(r.penugasan?.jam_tugas_tambahan) },
  { header: "JJM", get: (r) => v(r.penugasan?.jjm) },
  { header: "TOTAL JJM", get: (r) => r.totalJjm || "" },
  { header: "SISWA", get: (r) => v(r.penugasan?.jumlah_siswa_diajar) },
  { header: "KOMPETENSI", get: (r) => v(r.penugasan?.kompetensi) },
  { header: "SEKOLAH", get: (r) => v(r.penugasan?.nama_sekolah) },
  { header: "JENJANG ", get: (r) => v(r.penugasan?.jenjang_sekolah) }, // kolom "JENJANG" ke-2 (jenjang sekolah)
  { header: "SUMBER GAJI", get: (r) => v(r.gtk.sumber_gaji) },
  { header: "BESARAN GAJI POKOK", get: (r) => v(r.gtk.besaran_gaji_pokok) },
  { header: "SUAMI/ISTRI (ADA/TIDAK)", get: (r) => v(r.gtk.status_pasangan) },
  {
    header: "PEKERJAAN SUAMI / ISTRI (PNS/PPPK/TNI/POLRI/LAINNYA)",
    get: (r) => v(r.gtk.pekerjaan_suami_istri),
  },
  { header: "JUMLAH ANAK", get: (r) => v(r.gtk.jumlah_anak) },
  { header: "ALAMAT", get: (r) => v(r.gtk.alamat) },
  { header: "KELURAHAN", get: (r) => v(r.gtk.kelurahan) },
  { header: "GOLONGAN", get: (r) => v(r.gtk.golongan) },
  { header: "TMT KENAIKAN PANGKAT TERAKHIR", get: (r) => v(r.gtk.tmt_kenaikan_pangkat_terakhir) },
  { header: "TMT AWAL JADI GURU/ADMIN", get: (r) => v(r.gtk.tmt_awal_guru_admin) },
  { header: "TMT AWAL SEKOLAH INDUK", get: (r) => v(r.gtk.tmt_awal_sekolah_induk) },
  { header: "STATUS", get: (r) => v(r.penugasan?.status_sekolah) }, // status sekolah (Negeri/Swasta)
  { header: "NIK", get: (r) => v(r.gtk.nik) },
  { header: "NOMOR KARTU KELUARGA (KK)", get: (r) => v(r.gtk.no_kk) },
  { header: "NOMOR IJAZAH TERAKHIR", get: (r) => v(r.gtk.nomor_ijazah_terakhir) },
  { header: "NAMA SEKOLAH/PT SESUAI IJAZAH", get: (r) => v(r.gtk.nama_sekolah_ijazah) },
  {
    header: "TGL, BULAN, TAHUN LULUS PENDIDIKAN TERAKHIR",
    get: (r) => v(r.gtk.tanggal_lulus_pendidikan_terakhir),
  },
  { header: "NOMOR SK PERTAMA", get: (r) => v(r.gtk.nomor_sk_pertama) },
  { header: "TGL, BULAN TAHUN SK PERTAMA", get: (r) => v(r.gtk.tanggal_sk_pertama) },
  { header: "PEJABAT TTD SK PERTAMA", get: (r) => v(r.gtk.pejabat_ttd_sk_pertama) },
  { header: "HP/WA", get: (r) => v(r.gtk.hp) },
  { header: "JALUR PPPK", get: (r) => v(r.gtk.jalur_pppk) },
  { header: "AKUN SIM PKB", get: (r) => v(r.gtk.akun_sim_pkb) },
  { header: "AKUN BELAJAR", get: (r) => v(r.gtk.akun_belajar) },
  { header: "KECAMATAN SEKOLAH", get: (r) => v(r.penugasan?.kecamatan_sekolah) },
  { header: "KETERANGAN", get: (r) => v(r.gtk.keterangan) },
];

export function buildLaporanDinasRows(
  gtkList: Gtk[],
  penugasanList: GtkPenugasanMengajar[]
): LaporanDinasRow[] {
  const penugasanByGtkId = new Map<string, GtkPenugasanMengajar[]>();
  for (const p of penugasanList) {
    if (!penugasanByGtkId.has(p.gtk_id)) penugasanByGtkId.set(p.gtk_id, []);
    penugasanByGtkId.get(p.gtk_id)!.push(p);
  }

  const rows: LaporanDinasRow[] = [];

  const sortedGtk = [...gtkList].sort((a, b) =>
    (a.nama || "").localeCompare(b.nama || "", "id", { sensitivity: "base" })
  );

  for (const gtk of sortedGtk) {
    const penugasanArr = gtk.id ? penugasanByGtkId.get(gtk.id) ?? [] : [];
    const totalJjm = penugasanArr.reduce((acc, p) => {
      const n = parseFloat(p.jjm ?? "0");
      return acc + (isNaN(n) ? 0 : n);
    }, 0);

    if (penugasanArr.length === 0) {
      rows.push({ gtk, penugasan: null, totalJjm });
    } else {
      for (const p of penugasanArr) {
        rows.push({ gtk, penugasan: p, totalJjm });
      }
    }
  }

  return rows;
}
