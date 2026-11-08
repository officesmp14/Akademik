"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRole } from "@/lib/role-context";
import { compareKelas } from "@/lib/rekap-siswa";
import { ProfilSekolah } from "@/types/sekolah";
import { Search, Loader2, BookMarked, Printer } from "lucide-react";

type SiswaCover = {
  id: string;
  nama: string | null;
  nipd: string | null;
  nisn: string | null;
  rombel: string | null;
  tempat_lahir: string | null;
  tanggal_lahir: string | null;
  jk: string | null;
  agama: string | null;
  sekolah_asal: string | null;
  alamat: string | null;
  rt: string | null;
  kelurahan: string | null;
  kecamatan: string | null;
  nama_ayah: string | null;
  nama_ibu: string | null;
  ayah_pekerjaan: string | null;
  ibu_pekerjaan: string | null;
  nama_wali: string | null;
  wali_pekerjaan: string | null;
};

// Provinsi tidak ada di Profil Sekolah
const PROVINSI = "Kalimantan Utara";

// Isi halaman "PETUNJUK" (teks sesuai file cover_raport1.pdf) beserta posisi atas tiap butir (pt)
const PETUNJUK: { y: number; no: string; teks: string }[] = [
  {
    y: 135,
    no: "1.",
    teks: "Buku Laporan Hasil Pencapaian Kompetensi Peserta Didik, merupakan ringkasan hasil penilaian terhadap seluruh aktivitas pembelajaran yang dilakukan peserta didik dalam kurun waktu tertentu. Laporan perkembangan dan hasil Pencapaian Kompetensi peserta didik secara rinci, disajikan dalam portofolio yang merupakan bagian tidak terpisahkan dari Buku Laporan Hasil Pencapaian Kompetensi Peserta Didik ini.",
  },
  {
    y: 241,
    no: "2.",
    teks: "Buku Laporan Hasil Pecapaian Kompetensi Peserta Didik dipergunakan selama peserta didik yang bersangkutan mengikuti pelajaran di Sekolah Dasar.",
  },
  {
    y: 284,
    no: "3.",
    teks: "Apabila pindah sekolah, buku Laporan Hasil Pencapaian Kompetensi Peserta Didik ini dibawa oleh yang bersangkutan untuk dipergunakan di sekolah baru dengan meninggalkan arsip / copy di sekolah lama.",
  },
  {
    y: 341,
    no: "4.",
    teks: "Apabila buku Laporan Hasil Pencapaian Kompetensi Peserta Didik ini hilang, dapat diganti dengan Buku Laporan Hasil Pencapaian Kompetensi Peserta Didik pengganti yang disahkan oleh Kepala Sekolah asal.",
  },
  {
    y: 400,
    no: "5.",
    teks: "Buku Laporan Hasil Pencapaian Kompetensi Peserta Didik ini harus dilengkapi dengan pas foto (3cm x 4cm) dan pengisiannya dilakukan oleh Guru Kelas.",
  },
  {
    y: 442,
    no: "6.",
    teks: "Laporan penilaian memuat hasil Pencapaian Kompetensi yang disajikan secara deskriptif untuk masing-masing kompetensi inti.",
  },
  {
    y: 490,
    no: "7.",
    teks: "Laporan perkembangan fisik diisi dengan data kondisi peserta didik berdasarkan hasil pengukuran yang dilakukan guru bekerjasama dengan pihak lain yang relavan.",
  },
  {
    y: 537,
    no: "8.",
    teks: "Laporan kondisi kesehatan diisi dengan deskripsi hasil pemeriksaan yang dilakukan guru, bekerjasama dengan tenaga kesehatan atau puskesmas terdekat.",
  },
  {
    y: 583,
    no: "9.",
    teks: "Kolom ketidakhadiran diisi dengan data akumulasi ketidakhadiran siswa baik karena sakit, izin, maupun tanpa keterangan dalam satu semester.",
  },
];

const bersihWilayah = (s: string | null) => (s ?? "").replace(/^desa\/kel\.?\s*/i, "").replace(/^kec\.?\s*/i, "").trim();

const tglLahir = (s: string | null) => {
  if (!s) return "";
  const d = new Date(s + "T00:00:00");
  return isNaN(d.getTime()) ? s : d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
};

// ---- Elemen posisi mutlak (satuan pt, koordinat sama dengan file PDF contoh: y = garis dasar teks) ----
const FONT = '"Times New Roman", Times, serif';

function T({ x, y, w, children }: { x: number; y: number; w?: number; children: React.ReactNode }) {
  return (
    <div
      style={{
        position: "absolute",
        left: `${x}pt`,
        top: `${y - 12}pt`,
        width: w ? `${w}pt` : undefined,
        whiteSpace: w ? "normal" : "nowrap",
        lineHeight: "14pt",
      }}
    >
      {children}
    </div>
  );
}

function C({ y, children }: { y: number; children: React.ReactNode }) {
  return (
    <div style={{ position: "absolute", left: 0, width: "595pt", top: `${y - 12}pt`, textAlign: "center", lineHeight: "14pt" }}>
      {children}
    </div>
  );
}

function Halaman({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: "relative",
        width: "595pt",
        height: "841pt",
        overflow: "hidden",
        pageBreakAfter: "always",
        breakAfter: "page",
        fontFamily: FONT,
        fontSize: "12pt",
        color: "#000",
        background: "#fff",
      }}
    >
      {children}
    </div>
  );
}

function CoverSiswa({ s, profil, tanggalRapor }: { s: SiswaCover; profil: ProfilSekolah | null; tanggalRapor: string }) {
  const tampilTanggal = tanggalRapor
    ? new Date(tanggalRapor + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
    : "";
  const alamatSiswa = [s.alamat, s.rt ? `RT ${s.rt}` : null, bersihWilayah(s.kelurahan), bersihWilayah(s.kecamatan)]
    .filter(Boolean)
    .join(", ");

  const baris4: { y: number; no?: string; label: string; sub?: boolean; nilai?: string; wrap?: boolean }[] = [
    { y: 125, no: "1.", label: "Nama Peserta Didik", nilai: s.nama ?? "" },
    { y: 146, no: "2.", label: "Nomor Induk Sekolah", nilai: s.nipd ?? "" },
    { y: 167, no: "3.", label: "Nomor Induk Nasional", nilai: s.nisn ?? "" },
    {
      y: 188,
      no: "4.",
      label: "Tempat, Tanggal Lahir",
      nilai: [s.tempat_lahir, tglLahir(s.tanggal_lahir)].filter(Boolean).join(", "),
    },
    { y: 209, no: "5.", label: "Jenis Kelamin", nilai: s.jk === "L" ? "Laki-laki" : s.jk === "P" ? "Perempuan" : "" },
    { y: 230, no: "6.", label: "Agama", nilai: s.agama ?? "" },
    { y: 251, no: "7.", label: "Pendidikan Sebelumnya", nilai: s.sekolah_asal ?? "" },
    { y: 272, no: "8.", label: "Alamat Peserta Didik", nilai: alamatSiswa, wrap: true },
    { y: 314, no: "9.", label: "Nama Orang Tua" },
    { y: 335, label: "a. Ayah", sub: true, nilai: s.nama_ayah ?? "" },
    { y: 356, label: "b. Ibu", sub: true, nilai: s.nama_ibu ?? "" },
    { y: 377, no: "10.", label: "Pekerjaan Orang Tua" },
    { y: 398, label: "a. Ayah", sub: true, nilai: s.ayah_pekerjaan ?? "" },
    { y: 419, label: "b. Ibu", sub: true, nilai: s.ibu_pekerjaan ?? "" },
    { y: 440, no: "11.", label: "Alamat Orang Tua" },
    { y: 461, label: "a. Jalan", sub: true, nilai: s.alamat ?? "" },
    { y: 482, label: "b. Kelurahan/Desa", sub: true, nilai: bersihWilayah(s.kelurahan) },
    { y: 503, label: "c. Kecamatan", sub: true, nilai: bersihWilayah(s.kecamatan) },
    { y: 524, label: "d. Kabupaten/Kota", sub: true, nilai: "" },
    { y: 545, label: "e. Provinsi", sub: true, nilai: "" },
    { y: 587, no: "12.", label: "Wali Peserta Didik" },
    { y: 608, label: "a. Nama", sub: true, nilai: s.nama_wali ?? "" },
    { y: 629, label: "b. Pekerjaan", sub: true, nilai: s.wali_pekerjaan ?? "" },
    { y: 650, label: "c. Alamat", sub: true, nilai: "" },
  ];

  const rowsSekolah: [string, string][] = [
    ["Nama Sekolah", profil?.nama_sekolah ?? ""],
    ["NSS / NPSN", profil?.npsn ?? profil?.nss ?? ""],
    ["Alamat Sekolah", profil?.alamat ?? ""],
    ["Kelurahan", profil?.kelurahan ?? ""],
    ["Kecamatan", profil?.kecamatan ?? ""],
    ["Kabupaten / Kota", profil?.kota_kabupaten ?? ""],
    ["Propinsi", PROVINSI],
    ["Website", profil?.website ?? ""],
    ["Email", profil?.email ?? ""],
  ];

  return (
    <>
      {/* Halaman 1 -- Sampul */}
      <Halaman>
        {profil?.logo_tutwuri_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profil.logo_tutwuri_url}
            alt="Tut Wuri Handayani"
            style={{ position: "absolute", left: "227pt", top: "100pt", width: "140pt", height: "140pt", objectFit: "contain" }}
          />
        )}
        <C y={259}>RAPOR</C>
        <C y={275}>HASIL CAPAIAN KOMPETENSI PESERTA DIDIK</C>
        <C y={290}>SEKOLAH MENENGAH PERTAMA (SMP)</C>
        <T x={149} y={393}>NAMA</T>
        <T x={254} y={393}>:</T>
        <T x={275} y={393}>{(s.nama ?? "").toUpperCase()}</T>
        <T x={149} y={428}>NISN</T>
        <T x={254} y={428}>:</T>
        <T x={275} y={428}>{s.nisn ?? ""}</T>
        <C y={748}>KEMENTERIAN PENDIDIKAN DAN KEBUDAYAAN</C>
        <C y={763}>REPUBLIK INDONESIA</C>
      </Halaman>

      {/* Halaman 2 -- Identitas sekolah */}
      <Halaman>
        <C y={102}>RAPOR</C>
        <C y={132}>HASIL CAPAIAN KOMPETENSI PESERTA DIDIK</C>
        <C y={162}>SEKOLAH MENENGAH PERTAMA (SMP)</C>
        {rowsSekolah.map(([label, nilai], i) => (
          <div key={label}>
            <T x={128} y={228 + i * 30}>{label}</T>
            <T x={233} y={228 + i * 30}>:</T>
            <T x={254} y={228 + i * 30} w={300}>{nilai}</T>
          </div>
        ))}
      </Halaman>

      {/* Halaman 3 -- Petunjuk */}
      <Halaman>
        <C y={73}>PETUNJUK</C>
        {PETUNJUK.map((p) => (
          <div key={p.no}>
            <T x={60} y={p.y}>{p.no}</T>
            <div
              style={{
                position: "absolute",
                left: "90pt",
                top: `${p.y - 12}pt`,
                width: "445pt",
                textAlign: "justify",
                lineHeight: "15pt",
              }}
            >
              {p.teks}
            </div>
          </div>
        ))}
      </Halaman>

      {/* Halaman 4 -- Identitas peserta didik */}
      <Halaman>
        <C y={73}>IDENTITAS PESERTA DIDIK</C>
        {baris4.map((b) => (
          <div key={b.y}>
            {b.no && <T x={60} y={b.y}>{b.no}</T>}
            <T x={90} y={b.y}>{b.label}</T>
            {b.nilai !== undefined && (
              <>
                <T x={254} y={b.y}>:</T>
                <T x={275} y={b.y} w={b.wrap ? 280 : undefined}>{b.nilai}</T>
              </>
            )}
          </div>
        ))}

        {/* Kotak pas foto 3 x 4 cm */}
        <div
          style={{
            position: "absolute",
            left: "222pt",
            top: "690pt",
            width: "85pt",
            height: "113pt",
            border: "1px solid #000",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "11pt",
          }}
        >
          <span>photo</span>
          <span>3 x 4 cm</span>
        </div>

        <T x={359} y={680}>
          {profil?.kota_kabupaten ?? ""}, {tampilTanggal}
        </T>
        <T x={359} y={695}>Kepala Sekolah,</T>
        {profil?.ttd_kepala_sekolah_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profil.ttd_kepala_sekolah_url}
            alt=""
            style={{ position: "absolute", left: "359pt", top: "700pt", width: "90pt", height: "70pt", objectFit: "contain" }}
          />
        )}
        <T x={359} y={773}>{profil?.nama_kepala_sekolah ?? ""}</T>
        <T x={359} y={788}>NIP. {profil?.nip_kepala_sekolah ?? ""}</T>
      </Halaman>
    </>
  );
}

export default function CoverRaporPage() {
  const { role, waliKelasRombel, isStafLihatSiswa } = useRole();
  // Staf (jenis_ptk_pdd tertentu) boleh mencetak cover rapor semua kelas
  const isFullAccessRole = role === "admin" || role === "kepala_sekolah" || isStafLihatSiswa;
  const lockedToOwnClass = !isFullAccessRole && Boolean(waliKelasRombel);

  const [profil, setProfil] = useState<ProfilSekolah | null>(null);
  const [siswaList, setSiswaList] = useState<SiswaCover[]>([]);
  const [rombelOptions, setRombelOptions] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [filterRombel, setFilterRombel] = useState("");
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [tanggalRapor, setTanggalRapor] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [printData, setPrintData] = useState<SiswaCover[] | null>(null);

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      setError(null);
      const supabase = createClient();

      let siswaQuery = supabase
        .from("siswa01")
        .select(
          "id, nama, nipd, nisn, rombel, tempat_lahir, tanggal_lahir, jk, agama, sekolah_asal, alamat, rt, kelurahan, kecamatan, nama_ayah, nama_ibu, ayah_pekerjaan, ibu_pekerjaan, nama_wali, wali_pekerjaan"
        )
        .eq("status_siswa", "Aktif")
        .order("nama", { ascending: true });
      if (lockedToOwnClass) siswaQuery = siswaQuery.eq("rombel", waliKelasRombel!);

      const [{ data: profilData }, { data: siswaData, error: siswaError }] = await Promise.all([
        supabase.from("profil_sekolah").select("*").eq("id", 1).maybeSingle(),
        siswaQuery,
      ]);

      if (siswaError) {
        setError(siswaError.message);
        setLoading(false);
        return;
      }

      setProfil(profilData ?? null);
      setSiswaList((siswaData ?? []) as SiswaCover[]);
      if (!lockedToOwnClass) {
        setRombelOptions(
          Array.from(new Set((siswaData ?? []).map((s) => s.rombel).filter(Boolean) as string[])).sort(compareKelas)
        );
      }
      setLoading(false);
    }
    fetchAll();
  }, [lockedToOwnClass, waliKelasRombel]);

  // Cetak A4 tanpa margin -- hanya berlaku di halaman ini
  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = "@page { size: A4 portrait; margin: 0; }";
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const filteredSiswa = useMemo(() => {
    const q = search.trim().toLowerCase();
    return siswaList.filter((s) => {
      if (filterRombel && s.rombel !== filterRombel) return false;
      if (q && !(s.nama ?? "").toLowerCase().includes(q) && !(s.nisn ?? "").includes(q)) return false;
      return true;
    });
  }, [siswaList, search, filterRombel]);

  function toggleChecked(id: string) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allVisibleChecked = filteredSiswa.length > 0 && filteredSiswa.every((s) => checkedIds.has(s.id));

  function toggleCheckAllVisible() {
    const ids = filteredSiswa.map((s) => s.id);
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleChecked) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  }

  function handlePrint() {
    if (checkedIds.size === 0) {
      setError("Pilih minimal satu siswa terlebih dahulu.");
      return;
    }
    setError(null);
    setPrintData(siswaList.filter((s) => checkedIds.has(s.id)));
    setTimeout(() => window.print(), 500);
  }

  const inputClass =
    "rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500";

  return (
    <>
      <div className="p-6 md:p-8 dark:bg-slate-900 print:hidden">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Cover Rapor</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {lockedToOwnClass && (
                <>
                  Wali Kelas <strong>{waliKelasRombel}</strong> &middot;{" "}
                </>
              )}
              Pilih siswa, lalu cetak cover rapor (kertas A4, 4 halaman per siswa)
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Tanggal rapor</label>
              <input type="date" value={tanggalRapor} onChange={(e) => setTanggalRapor(e.target.value)} className={inputClass} />
            </div>
            <button
              onClick={handlePrint}
              disabled={checkedIds.size === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white text-sm font-medium px-4 py-2.5 hover:bg-indigo-700 transition-colors disabled:opacity-50 self-end"
            >
              <Printer className="h-4 w-4" />
              Cetak ({checkedIds.size})
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama / NISN..."
              className={`${inputClass} pl-9 w-56`}
            />
          </div>
          {!lockedToOwnClass && (
            <select value={filterRombel} onChange={(e) => setFilterRombel(e.target.value)} className={inputClass}>
              <option value="">Semua Kelas</option>
              {rombelOptions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          )}
        </div>

        {!profil?.logo_tutwuri_url && !loading && (
          <p className="text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 rounded-lg px-3 py-2 mb-4">
            Logo Tut Wuri Handayani belum diupload di Profil Sekolah, jadi sampul dicetak tanpa logo.
          </p>
        )}
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg px-3 py-2 mb-4">
            {error}
          </p>
        )}

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40 text-left text-slate-500 dark:text-slate-400">
                <th className="px-4 py-3 w-12">
                  <input type="checkbox" checked={allVisibleChecked} onChange={toggleCheckAllVisible} className="h-4 w-4 rounded border-slate-300" />
                </th>
                <th className="px-4 py-3 font-medium">Nama</th>
                <th className="px-4 py-3 font-medium">NISN</th>
                <th className="px-4 py-3 font-medium">Kelas</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : filteredSiswa.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500">
                    <BookMarked className="h-6 w-6 mx-auto mb-2 text-slate-300" />
                    Tidak ada siswa.
                  </td>
                </tr>
              ) : (
                filteredSiswa.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => toggleChecked(s.id)}
                    className="border-b border-slate-100 dark:border-slate-700/60 last:border-0 cursor-pointer hover:bg-slate-50/60 dark:hover:bg-slate-700"
                  >
                    <td className="px-4 py-2.5">
                      <input
                        type="checkbox"
                        checked={checkedIds.has(s.id)}
                        onChange={() => toggleChecked(s.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                    </td>
                    <td className="px-4 py-2.5 font-medium text-slate-800 dark:text-slate-200">{s.nama}</td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{s.nisn ?? "-"}</td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{s.rombel ?? "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {printData && (
        <div className="hidden print:block">
          {printData.map((s) => (
            <CoverSiswa key={s.id} s={s} profil={profil} tanggalRapor={tanggalRapor} />
          ))}
        </div>
      )}
    </>
  );
}
