import { FileBarChart, Armchair, IdCard, UtensilsCrossed, Landmark, HeartPulse, PieChart, GitCompareArrows, LogOut, ListChecks, FileText } from "lucide-react";

const LAPORAN_LIST = [
  {
    href: "/laporan/rekap-siswa",
    icon: FileBarChart,
    title: "Rekap Siswa",
    description:
      "Rekap jumlah siswa aktif berdasarkan jenis kelamin dan agama — per kelas, per jenjang, dan keseluruhan.",
  },
  {
    href: "/laporan/bandingkan-data",
    icon: GitCompareArrows,
    title: "Bandingkan Data",
    description:
      "Upload file Excel (mis. export Dapodik) dan bandingkan dengan data siswa di aplikasi berdasarkan NISN.",
  },
  {
    href: "/laporan/statistik-sekolah",
    icon: PieChart,
    title: "Statistik Rombel & Agama",
    description:
      "Jumlah rombel per jenjang (VII, VIII, IX) dan jumlah siswa aktif berdasarkan agama.",
  },
  {
    href: "/laporan/riwayat-mutasi",
    icon: LogOut,
    title: "Riwayat Siswa Mutasi Keluar",
    description:
      "Daftar siswa yang mutasi keluar beserta tanggal, alasan, dan sekolah tujuan.",
  },
  {
    href: "/laporan/cek-kursi",
    icon: Armchair,
    title: "Cek Kursi",
    description:
      "Cek kelas mana saja yang sudah penuh dan kelas mana yang masih memiliki slot kursi kosong.",
  },
  {
    href: "/laporan/cek-nis",
    icon: IdCard,
    title: "Cek NIS",
    description:
      "Cek NIS terakhir yang sudah diberikan dan generate NIS berikutnya untuk siswa baru/pindahan.",
  },
  {
    href: "/laporan/data-siswa-mbg",
    icon: UtensilsCrossed,
    title: "Data Siswa MBG",
    description:
      "Daftar siswa per kelas untuk kebutuhan panitia Makan Bergizi Gratis (MBG).",
  },
  {
    href: "/laporan/dinas-gtk",
    icon: Landmark,
    title: "Laporan Dinas Pendidikan (GTK)",
    description:
      "Laporan data GTK dengan format kolom sesuai file Master Update Dinas Pendidikan.",
  },
  {
    href: "/laporan/kesehatan",
    icon: HeartPulse,
    title: "Data Pemeriksaan Kesehatan",
    description:
      "Daftar siswa lengkap dengan data pribadi & kontak orang tua untuk keperluan pemeriksaan kesehatan.",
  },
  {
    href: "/laporan/kelas-ix",
    icon: ListChecks,
    title: "Cek Data Ijazah Kelas IX",
    description:
      "Cek data siswa kelas IX (NIPD, NISN, NIK, nama ayah, No KK, dll) per kelas, dengan pagination.",
  },
  {
    href: "/laporan/verifikasi-presensi",
    icon: FileText,
    title: "Verifikasi Presensi",
    description:
      "Form verifikasi kehadiran siswa (Alpa/Izin/Sakit) per bulan berdasarkan hari efektif, untuk kebutuhan verifikasi ke Dinas Pendidikan.",
  },
];

export default function LaporanIndexPage() {
  return (
    <div className="p-6 md:p-8">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-1">Laporan</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Pilih jenis laporan yang ingin dilihat</p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {LAPORAN_LIST.map((item) => {
          const Icon = item.icon;
          return (
            <a
              key={item.href}
              href={item.href}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:shadow-sm transition-all"
            >
              <div className="h-10 w-10 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center mb-3">
                <Icon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">{item.title}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{item.description}</p>
            </a>
          );
        })}
      </div>
    </div>
  );
}
