"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRole } from "@/lib/role-context";
import { GraduationCap, Users, Users2, FileBarChart, UserCog, ShieldUser, KeySquare, School, NotebookPen, Settings2, BookOpenCheck, Building2, CalendarDays, FileText, CalendarClock, Tags, ClipboardList, Ruler, ArrowRightLeft, FileEdit, ListChecks, Home, ChevronRight, ClipboardCheck, CalendarCheck2, LogOut, UserPlus, Link2, Trophy } from "lucide-react";

const LAPORAN_MODULES = [
  "laporan_rekap_siswa",
  "laporan_statistik_sekolah",
  "laporan_bandingkan_data",
  "laporan_riwayat_mutasi",
  "laporan_cek_kursi",
  "laporan_cek_nis",
  "laporan_data_siswa_mbg",
  "laporan_dinas_gtk",
  "laporan_kesehatan",
  "laporan_kelas_ix",
  "laporan_verifikasi_presensi",
];

export default function SidebarNav({ collapsed = false }: { collapsed?: boolean }) {
  const pathname = usePathname();
  const { role, moduleAccess, waliKelasRombel, hasMengajarKelas, isKetuaEkskul } = useRole();

  const isActiveHome = pathname === "/home";
  const isActiveSiswa = pathname.startsWith("/siswa") && !pathname.startsWith("/siswa/mutasi-masuk");
  const isActiveGtk = pathname.startsWith("/gtk");
  const isActiveLaporan = pathname.startsWith("/laporan");
  const isActiveProfil = pathname.startsWith("/profil-saya");
  const isActiveAdminUsers = pathname.startsWith("/admin/users");
  const isActiveAdminAccess = pathname.startsWith("/admin/access");
  const isActiveKelasSaya = pathname.startsWith("/kelas-saya");
  const isActiveRaporSts = pathname.startsWith("/rapor-sts");
  const isActiveAdminWaliKelas = pathname.startsWith("/admin/wali-kelas");
  const isActiveAdminKetuaEkskul = pathname.startsWith("/admin/ketua-ekskul");
  const isActiveNilai = pathname === "/nilai" || (pathname.startsWith("/nilai/") && !pathname.startsWith("/nilai-sts"));
  const isActiveNilaiSts = pathname.startsWith("/nilai-sts");
  const isActivePresensi = pathname === "/presensi";
  const isActiveRekapPresensi = pathname === "/presensi/rekap";
  const isActiveRekapPresensiMapel = pathname.startsWith("/presensi/rekap-mapel");
  const isActiveRekapHarian = pathname.startsWith("/presensi/rekap-harian");
  const isActiveKelolaUjian = pathname.startsWith("/kelola-ujian");
  const isActiveAdminMengajarKelas = pathname.startsWith("/admin/mengajar-kelas");
  const isActiveAdminPengaturanNilai = pathname.startsWith("/admin/pengaturan-nilai");
  const isActiveAdminProfilSekolah = pathname.startsWith("/admin/profil-sekolah");
  const isActiveAdminAkademik = pathname.startsWith("/admin/pengaturan-akademik");
  const isActiveAdminHariEfektif = pathname.startsWith("/admin/hari-efektif");
  const isActiveJadwalKombel = pathname.startsWith("/jadwal-kombel");
  const isActiveJadwalSupervisi = pathname.startsWith("/jadwal-supervisi");
  const isActiveLinkBebanKerja = pathname.startsWith("/link-beban-kerja");
  const isActiveEkstrakurikulerSiswa = pathname.startsWith("/ekstrakurikuler-siswa");
  const isActiveRegistrasi = pathname.startsWith("/registrasi-peserta-didik");
  const isActiveDataPeriodik = pathname.startsWith("/data-periodik");
  const isActiveLaporanKelasIx = pathname.startsWith("/laporan/kelas-ix");
  const isActiveRiwayatMutasi = pathname.startsWith("/laporan/riwayat-mutasi");
  const isActiveMutasiMasuk = pathname.startsWith("/siswa/mutasi-masuk");
  const isActiveVerifikasiPresensi = pathname.startsWith("/laporan/verifikasi-presensi");
  const isActiveReferensi = pathname.startsWith("/referensi");
  const isActiveTransferSiswaBaru = pathname.startsWith("/admin/transfer-siswa-baru");

  const showProfilSaya = role === "guru" || role === "staf_tu" || role === "kepala_sekolah";
  const isAdmin = role === "admin";
  const isFullAccessRole = role === "admin" || role === "kepala_sekolah";

  const hasExtraSiswaAccess = moduleAccess.some((a) => a.module === "siswa" && a.can_view);
  const hasExtraGtkAccess = moduleAccess.some((a) => a.module === "gtk" && a.can_view);
  const hasExtraLaporanAccess = moduleAccess.some(
    (a) => LAPORAN_MODULES.includes(a.module) && a.can_view
  );
  const hasExtraMutasiMasukAccess = moduleAccess.some(
    (a) => a.module === "mutasi_masuk_siswa" && a.can_view
  );
  const hasExtraRegistrasiAccess = moduleAccess.some(
    (a) => a.module === "registrasi_peserta_didik" && a.can_view
  );
  const hasExtraDataPeriodikAccess = moduleAccess.some(
    (a) => a.module === "data_periodik" && a.can_view
  );
  const hasExtraPresensiRekapAccess = moduleAccess.some(
    (a) => a.module === "presensi_rekap" && a.can_view
  );

  const showSiswaMenu = isFullAccessRole || hasExtraSiswaAccess;
  const showGtkMenu = isFullAccessRole || hasExtraGtkAccess;
  const showLaporanMenu = isFullAccessRole || hasExtraLaporanAccess;
  const showMutasiMasukMenu = isFullAccessRole || hasExtraMutasiMasukAccess;
  const showRegistrasiMenu = isFullAccessRole || hasExtraRegistrasiAccess || Boolean(waliKelasRombel);
  const showDataPeriodikMenu = isFullAccessRole || hasExtraDataPeriodikAccess || Boolean(waliKelasRombel);
  const showRekapPresensiMenu =
    hasMengajarKelas || Boolean(waliKelasRombel) || isFullAccessRole || hasExtraPresensiRekapAccess;

  const showDataSiswaSection =
    showSiswaMenu || showMutasiMasukMenu || showRegistrasiMenu || showDataPeriodikMenu || Boolean(waliKelasRombel);
  const showPresensiSection = hasMengajarKelas || Boolean(waliKelasRombel) || isFullAccessRole || showRekapPresensiMenu;
  const showNilaiUjianSection = hasMengajarKelas || Boolean(waliKelasRombel) || isFullAccessRole;

  const linkClass = (active: boolean) =>
    `flex items-center rounded-lg text-sm font-medium transition-colors ${
      collapsed ? "justify-center px-0 py-2.5" : "gap-2.5 px-3 py-2"
    } ${
      active
        ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400"
        : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
    }`;

  const sectionLabel = (text: string) =>
    collapsed ? (
      <div className="my-2 border-t border-slate-100 dark:border-slate-700" />
    ) : (
      <p className="px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        {text}
      </p>
    );

  return (
    <aside
      className={`shrink-0 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col transition-all duration-200 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      <div
        className={`h-16 flex items-center border-b border-slate-200 dark:border-slate-700 shrink-0 ${
          collapsed ? "justify-center px-0" : "gap-2.5 px-5"
        }`}
      >
        <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
          <GraduationCap className="h-4.5 w-4.5 text-white" />
        </div>
        {!collapsed && (
          <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm leading-tight">
            Portal SMP14
          </span>
        )}
      </div>

      <nav className={`flex-1 py-4 space-y-1 ${collapsed ? "px-2" : "px-3"}`}>
        <Link href="/home" title="Home" className={linkClass(isActiveHome)}>
          <Home className="h-4 w-4 shrink-0" />
          {!collapsed && "Home"}
        </Link>

        {showProfilSaya && (
          <Link href="/profil-saya" title="Profil Saya" className={linkClass(isActiveProfil)}>
            <UserCog className="h-4 w-4 shrink-0" />
            {!collapsed && "Profil Saya"}
          </Link>
        )}

        {showDataSiswaSection && (
          <>
            {sectionLabel("Data Siswa")}
            {showSiswaMenu && (
              <Link href="/siswa" title="Data Siswa" className={linkClass(isActiveSiswa)}>
                <Users className="h-4 w-4 shrink-0" />
                {!collapsed && "Data Siswa"}
              </Link>
            )}

            {showMutasiMasukMenu && (
              <Link href="/siswa/mutasi-masuk" title="Siswa Mutasi Masuk" className={linkClass(isActiveMutasiMasuk)}>
                <UserPlus className="h-4 w-4 shrink-0" />
                {!collapsed && "Siswa Mutasi Masuk"}
              </Link>
            )}

            {waliKelasRombel && (
              <Link href="/kelas-saya" title="Data Siswa Kelas Saya" className={linkClass(isActiveKelasSaya)}>
                <School className="h-4 w-4 shrink-0" />
                {!collapsed && "Data Siswa Kelas Saya"}
              </Link>
            )}

            {showRegistrasiMenu && (
              <Link
                href="/registrasi-peserta-didik"
                title="Registrasi Peserta Didik"
                className={linkClass(isActiveRegistrasi)}
              >
                <ClipboardList className="h-4 w-4 shrink-0" />
                {!collapsed && "Registrasi Peserta Didik"}
              </Link>
            )}

            {showDataPeriodikMenu && (
              <Link href="/data-periodik" title="Data Periodik" className={linkClass(isActiveDataPeriodik)}>
                <Ruler className="h-4 w-4 shrink-0" />
                {!collapsed && "Data Periodik"}
              </Link>
            )}

            {waliKelasRombel?.startsWith("IX.") && (
              <Link href="/laporan/kelas-ix" title="Cek Data Ijazah Kelas IX" className={linkClass(isActiveLaporanKelasIx)}>
                <ListChecks className="h-4 w-4 shrink-0" />
                {!collapsed && "Cek Data Ijazah Kelas IX"}
              </Link>
            )}

            {waliKelasRombel && (
              <Link
                href="/laporan/riwayat-mutasi"
                title="Riwayat Mutasi Keluar"
                className={linkClass(isActiveRiwayatMutasi)}
              >
                <LogOut className="h-4 w-4 shrink-0" />
                {!collapsed && "Riwayat Mutasi Keluar"}
              </Link>
            )}
          </>
        )}

        {showPresensiSection && (
          <>
            {sectionLabel("Presensi")}
            {hasMengajarKelas && (
              <Link href="/presensi" title="Presensi" className={linkClass(isActivePresensi)}>
                <ClipboardCheck className="h-4 w-4 shrink-0" />
                {!collapsed && "Presensi"}
              </Link>
            )}

            {hasMengajarKelas && (
              <Link
                href="/presensi/rekap-mapel"
                title="Rekap Presensi Mapel Saya"
                className={linkClass(isActiveRekapPresensiMapel)}
              >
                <ClipboardCheck className="h-4 w-4 shrink-0" />
                {!collapsed && "Rekap Presensi Mapel Saya"}
              </Link>
            )}

            {waliKelasRombel && (
              <Link
                href="/presensi/rekap-harian"
                title="Rekap Presensi Harian"
                className={linkClass(isActiveRekapHarian)}
              >
                <ClipboardCheck className="h-4 w-4 shrink-0" />
                {!collapsed && "Rekap Presensi Harian"}
              </Link>
            )}

            {showRekapPresensiMenu && (
              <Link href="/presensi/rekap" title="Rekap Presensi" className={linkClass(isActiveRekapPresensi)}>
                <ClipboardCheck className="h-4 w-4 shrink-0" />
                {!collapsed && "Rekap Presensi"}
              </Link>
            )}

            {waliKelasRombel && (
              <Link
                href="/laporan/verifikasi-presensi"
                title="Verifikasi Presensi"
                className={linkClass(isActiveVerifikasiPresensi)}
              >
                <FileText className="h-4 w-4 shrink-0" />
                {!collapsed && "Verifikasi Presensi"}
              </Link>
            )}
          </>
        )}

        {showNilaiUjianSection && (
          <>
            {sectionLabel("Nilai & Ujian")}
            {hasMengajarKelas && (
              <Link href="/nilai" title="Input Nilai" className={linkClass(isActiveNilai)}>
                <NotebookPen className="h-4 w-4 shrink-0" />
                {!collapsed && "Input Nilai"}
              </Link>
            )}

            {hasMengajarKelas && (
              <Link href="/nilai-sts" title="Input Nilai STS" className={linkClass(isActiveNilaiSts)}>
                <NotebookPen className="h-4 w-4 shrink-0" />
                {!collapsed && "Input Nilai STS"}
              </Link>
            )}

            {(waliKelasRombel || isFullAccessRole) && (
              <Link href="/rapor-sts" title="Cetak Rapor STS" className={linkClass(isActiveRaporSts)}>
                <FileText className="h-4 w-4 shrink-0" />
                {!collapsed && "Cetak Rapor STS"}
              </Link>
            )}

            {(hasMengajarKelas || isFullAccessRole) && (
              <Link href="/kelola-ujian" title="Kelola Ujian" className={linkClass(isActiveKelolaUjian)}>
                <FileEdit className="h-4 w-4 shrink-0" />
                {!collapsed && "Kelola Ujian"}
              </Link>
            )}
          </>
        )}

        {sectionLabel("Lainnya")}
        {showGtkMenu && (
          <Link href="/gtk" title="Data GTK" className={linkClass(isActiveGtk)}>
            <Users2 className="h-4 w-4 shrink-0" />
            {!collapsed && "Data GTK"}
          </Link>
        )}

        {showLaporanMenu && (
          <a href="/laporan" title="Laporan (punya sub-halaman)" className={linkClass(isActiveLaporan)}>
            <FileBarChart className="h-4 w-4 shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1">Laporan</span>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
              </>
            )}
          </a>
        )}

        <Link href="/jadwal-kombel" title="Jadwal Kombel" className={linkClass(isActiveJadwalKombel)}>
          <CalendarClock className="h-4 w-4 shrink-0" />
          {!collapsed && "Jadwal Kombel"}
        </Link>

        <Link href="/jadwal-supervisi" title="Jadwal Supervisi" className={linkClass(isActiveJadwalSupervisi)}>
          <CalendarCheck2 className="h-4 w-4 shrink-0" />
          {!collapsed && "Jadwal Supervisi"}
        </Link>

        <Link href="/link-beban-kerja" title="Link Beban Kerja" className={linkClass(isActiveLinkBebanKerja)}>
          <Link2 className="h-4 w-4 shrink-0" />
          {!collapsed && "Link Beban Kerja"}
        </Link>

        {(isFullAccessRole || Boolean(waliKelasRombel) || isKetuaEkskul) && (
          <Link
            href="/ekstrakurikuler-siswa"
            title="Ekstrakurikuler Siswa"
            className={linkClass(isActiveEkstrakurikulerSiswa)}
          >
            <Trophy className="h-4 w-4 shrink-0" />
            {!collapsed && "Ekstrakurikuler Siswa"}
          </Link>
        )}

        {isAdmin && (
          <>
            {sectionLabel("User & Akses")}
            <a href="/admin/users" title="Kelola User" className={linkClass(isActiveAdminUsers)}>
              <ShieldUser className="h-4 w-4 shrink-0" />
              {!collapsed && "Kelola User"}
            </a>
            <a href="/admin/access" title="Hak Akses" className={linkClass(isActiveAdminAccess)}>
              <KeySquare className="h-4 w-4 shrink-0" />
              {!collapsed && "Hak Akses"}
            </a>

            {sectionLabel("Kelas & Pengajaran")}
            <a href="/admin/wali-kelas" title="Wali Kelas" className={linkClass(isActiveAdminWaliKelas)}>
              <School className="h-4 w-4 shrink-0" />
              {!collapsed && "Wali Kelas"}
            </a>
            <a
              href="/admin/ketua-ekskul"
              title="Ketua Ekstrakurikuler"
              className={linkClass(isActiveAdminKetuaEkskul)}
            >
              <Trophy className="h-4 w-4 shrink-0" />
              {!collapsed && "Ketua Ekstrakurikuler"}
            </a>
            <a
              href="/admin/mengajar-kelas"
              title="Penugasan Mengajar Kelas"
              className={linkClass(isActiveAdminMengajarKelas)}
            >
              <BookOpenCheck className="h-4 w-4 shrink-0" />
              {!collapsed && "Penugasan Mengajar Kelas"}
            </a>

            {sectionLabel("Pengaturan Sekolah")}
            <a
              href="/admin/profil-sekolah"
              title="Profil Sekolah"
              className={linkClass(isActiveAdminProfilSekolah)}
            >
              <Building2 className="h-4 w-4 shrink-0" />
              {!collapsed && "Profil Sekolah"}
            </a>
            <a
              href="/admin/pengaturan-akademik"
              title="Pengaturan Akademik"
              className={linkClass(isActiveAdminAkademik)}
            >
              <CalendarDays className="h-4 w-4 shrink-0" />
              {!collapsed && "Pengaturan Akademik"}
            </a>
            <a
              href="/admin/hari-efektif"
              title="Hari Efektif per Bulan"
              className={linkClass(isActiveAdminHariEfektif)}
            >
              <CalendarCheck2 className="h-4 w-4 shrink-0" />
              {!collapsed && "Hari Efektif per Bulan"}
            </a>
            <a
              href="/admin/pengaturan-nilai"
              title="Pengaturan Nilai"
              className={linkClass(isActiveAdminPengaturanNilai)}
            >
              <Settings2 className="h-4 w-4 shrink-0" />
              {!collapsed && "Pengaturan Nilai"}
            </a>

            {sectionLabel("Data Master")}
            <Link
              href="/referensi"
              title="Referensi (punya sub-halaman)"
              className={linkClass(isActiveReferensi)}
            >
              <Tags className="h-4 w-4 shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1">Referensi</span>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                </>
              )}
            </Link>
            <Link
              href="/admin/transfer-siswa-baru"
              title="Transfer Data Siswa Baru"
              className={linkClass(isActiveTransferSiswaBaru)}
            >
              <ArrowRightLeft className="h-4 w-4 shrink-0" />
              {!collapsed && "Transfer Data Siswa Baru"}
            </Link>
          </>
        )}
      </nav>
    </aside>
  );
}
