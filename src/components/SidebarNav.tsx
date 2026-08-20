"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRole } from "@/lib/role-context";
import { GraduationCap, Users, Users2, FileBarChart, UserCog, ShieldUser, KeySquare, School, NotebookPen, Settings2, BookOpenCheck, Building2, CalendarDays, FileText, CalendarClock, Tags, ClipboardList, Ruler, ArrowRightLeft, FileEdit, ListChecks, Home } from "lucide-react";

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
];

export default function SidebarNav({ collapsed = false }: { collapsed?: boolean }) {
  const pathname = usePathname();
  const { role, moduleAccess, waliKelasRombel, hasMengajarKelas } = useRole();

  const isActiveHome = pathname === "/home";
  const isActiveSiswa = pathname.startsWith("/siswa");
  const isActiveGtk = pathname.startsWith("/gtk");
  const isActiveLaporan = pathname.startsWith("/laporan");
  const isActiveProfil = pathname.startsWith("/profil-saya");
  const isActiveAdminUsers = pathname.startsWith("/admin/users");
  const isActiveAdminAccess = pathname.startsWith("/admin/access");
  const isActiveKelasSaya = pathname.startsWith("/kelas-saya");
  const isActiveRaporSts = pathname.startsWith("/rapor-sts");
  const isActiveAdminWaliKelas = pathname.startsWith("/admin/wali-kelas");
  const isActiveNilai = pathname === "/nilai" || (pathname.startsWith("/nilai/") && !pathname.startsWith("/nilai-sts"));
  const isActiveNilaiSts = pathname.startsWith("/nilai-sts");
  const isActiveKelolaUjian = pathname.startsWith("/kelola-ujian");
  const isActiveAdminMengajarKelas = pathname.startsWith("/admin/mengajar-kelas");
  const isActiveAdminPengaturanNilai = pathname.startsWith("/admin/pengaturan-nilai");
  const isActiveAdminProfilSekolah = pathname.startsWith("/admin/profil-sekolah");
  const isActiveAdminAkademik = pathname.startsWith("/admin/pengaturan-akademik");
  const isActiveJadwalKombel = pathname.startsWith("/jadwal-kombel");
  const isActiveRegistrasi = pathname.startsWith("/registrasi-peserta-didik");
  const isActiveDataPeriodik = pathname.startsWith("/data-periodik");
  const isActiveLaporanKelasIx = pathname.startsWith("/laporan/kelas-ix");
  const isActiveReferensi = pathname.startsWith("/referensi");
  const isActiveTransferSiswaBaru = pathname.startsWith("/admin/transfer-siswa-baru");

  const isGuruOrTu = role === "guru" || role === "staf_tu";
  const isAdmin = role === "admin";
  const isFullAccessRole = role === "admin" || role === "kepala_sekolah";

  const hasExtraSiswaAccess = moduleAccess.some((a) => a.module === "siswa" && a.can_view);
  const hasExtraGtkAccess = moduleAccess.some((a) => a.module === "gtk" && a.can_view);
  const hasExtraLaporanAccess = moduleAccess.some(
    (a) => LAPORAN_MODULES.includes(a.module) && a.can_view
  );

  const showSiswaMenu = isFullAccessRole || hasExtraSiswaAccess;
  const showGtkMenu = isFullAccessRole || hasExtraGtkAccess;
  const showLaporanMenu = isFullAccessRole || hasExtraLaporanAccess;

  const linkClass = (active: boolean) =>
    `flex items-center rounded-lg text-sm font-medium transition-colors ${
      collapsed ? "justify-center px-0 py-2.5" : "gap-2.5 px-3 py-2"
    } ${active ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50"}`;

  const sectionLabel = (text: string) =>
    collapsed ? (
      <div className="my-2 border-t border-slate-100" />
    ) : (
      <p className="px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        {text}
      </p>
    );

  return (
    <aside
      className={`shrink-0 border-r border-slate-200 bg-white flex flex-col transition-all duration-200 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      <div
        className={`h-16 flex items-center border-b border-slate-200 shrink-0 ${
          collapsed ? "justify-center px-0" : "gap-2.5 px-5"
        }`}
      >
        <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
          <GraduationCap className="h-4.5 w-4.5 text-white" />
        </div>
        {!collapsed && (
          <span className="font-semibold text-slate-900 text-sm leading-tight">
            Portal SMP14
          </span>
        )}
      </div>

      <nav className={`flex-1 py-4 space-y-1 ${collapsed ? "px-2" : "px-3"}`}>
        <Link href="/home" title="Home" className={linkClass(isActiveHome)}>
          <Home className="h-4 w-4 shrink-0" />
          {!collapsed && "Home"}
        </Link>

        {isGuruOrTu && (
          <Link href="/profil-saya" title="Profil Saya" className={linkClass(isActiveProfil)}>
            <UserCog className="h-4 w-4 shrink-0" />
            {!collapsed && "Profil Saya"}
          </Link>
        )}

        {showSiswaMenu && (
          <Link href="/siswa" title="Data Siswa" className={linkClass(isActiveSiswa)}>
            <Users className="h-4 w-4 shrink-0" />
            {!collapsed && "Data Siswa"}
          </Link>
        )}

        {waliKelasRombel && (
          <Link href="/kelas-saya" title="Data Siswa Kelas Saya" className={linkClass(isActiveKelasSaya)}>
            <School className="h-4 w-4 shrink-0" />
            {!collapsed && "Data Siswa Kelas Saya"}
          </Link>
        )}

        {(showSiswaMenu || waliKelasRombel) && (
          <Link
            href="/registrasi-peserta-didik"
            title="Registrasi Peserta Didik"
            className={linkClass(isActiveRegistrasi)}
          >
            <ClipboardList className="h-4 w-4 shrink-0" />
            {!collapsed && "Registrasi Peserta Didik"}
          </Link>
        )}

        {waliKelasRombel?.startsWith("IX.") && (
          <Link href="/laporan/kelas-ix" title="Cek Data Ijazah Kelas IX" className={linkClass(isActiveLaporanKelasIx)}>
            <ListChecks className="h-4 w-4 shrink-0" />
            {!collapsed && "Cek Data Ijazah Kelas IX"}
          </Link>
        )}

        {(showSiswaMenu || waliKelasRombel) && (
          <Link href="/data-periodik" title="Data Periodik" className={linkClass(isActiveDataPeriodik)}>
            <Ruler className="h-4 w-4 shrink-0" />
            {!collapsed && "Data Periodik"}
          </Link>
        )}

        {showGtkMenu && (
          <Link href="/gtk" title="Data GTK" className={linkClass(isActiveGtk)}>
            <Users2 className="h-4 w-4 shrink-0" />
            {!collapsed && "Data GTK"}
          </Link>
        )}

        {showLaporanMenu && (
          <a href="/laporan" title="Laporan" className={linkClass(isActiveLaporan)}>
            <FileBarChart className="h-4 w-4 shrink-0" />
            {!collapsed && "Laporan"}
          </a>
        )}

        <Link href="/jadwal-kombel" title="Jadwal Kombel" className={linkClass(isActiveJadwalKombel)}>
          <CalendarClock className="h-4 w-4 shrink-0" />
          {!collapsed && "Jadwal Kombel"}
        </Link>

        {(waliKelasRombel || isFullAccessRole) && (
          <Link href="/rapor-sts" title="Cetak Rapor STS" className={linkClass(isActiveRaporSts)}>
            <FileText className="h-4 w-4 shrink-0" />
            {!collapsed && "Cetak Rapor STS"}
          </Link>
        )}

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

        {(hasMengajarKelas || isFullAccessRole) && (
          <Link href="/kelola-ujian" title="Kelola Ujian" className={linkClass(isActiveKelolaUjian)}>
            <FileEdit className="h-4 w-4 shrink-0" />
            {!collapsed && "Kelola Ujian"}
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
              href="/admin/pengaturan-nilai"
              title="Pengaturan Nilai"
              className={linkClass(isActiveAdminPengaturanNilai)}
            >
              <Settings2 className="h-4 w-4 shrink-0" />
              {!collapsed && "Pengaturan Nilai"}
            </a>

            {sectionLabel("Data Master")}
            <Link href="/referensi" title="Referensi" className={linkClass(isActiveReferensi)}>
              <Tags className="h-4 w-4 shrink-0" />
              {!collapsed && "Referensi"}
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
