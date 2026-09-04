"use client";

import { ProfilSekolah } from "@/types/sekolah";

export type SiswaKartu = {
  nama: string | null;
  nipd: string | null;
  nisn: string | null;
  tempat_lahir: string | null;
  tanggal_lahir: string | null;
  jk: "L" | "P" | null;
  alamat: string | null;
  rombel: string | null;
};

function formatTanggalLahir(tgl: string | null) {
  if (!tgl) return "-";
  return new Date(`${tgl}T00:00:00`).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function labelJk(jk: SiswaKartu["jk"]) {
  if (jk === "L") return "Laki-laki";
  if (jk === "P") return "Perempuan";
  return "-";
}

/** Lebar tetap standar kartu ID (CR80, 85.6 x 54mm) supaya posisi overlay
 *  konsisten dilihat & dicetak. Gambar template mengisi seluruh kotak
 *  (object-cover) -- kalau rasio gambar templatenya beda, sebagian sisi
 *  bisa terpotong; sesuaikan lagi kalau desain aslinya beda proporsi. */
const CARD_STYLE: React.CSSProperties = {
  width: "85.6mm",
  aspectRatio: "1.586",
  containerType: "inline-size",
};

/** Placeholder foto siswa -- belum ada fitur upload foto siswa di aplikasi
 *  ini, jadi kotak foto ditampilkan sebagai siluet kosong dulu. */
function FotoPlaceholder() {
  return (
    <div className="w-full h-full bg-slate-100 border border-slate-300 flex items-center justify-center overflow-hidden">
      <svg viewBox="0 0 24 24" className="w-2/3 h-2/3 text-slate-300" fill="currentColor">
        <path d="M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0 2c-3.34 0-10 1.68-10 5v3h20v-3c0-3.32-6.66-5-10-5z" />
      </svg>
    </div>
  );
}

export function KartuPelajarDepan({
  profil,
  siswa,
  qrDataUrl,
}: {
  profil: ProfilSekolah;
  siswa: SiswaKartu;
  qrDataUrl: string;
}) {
  const ttl = [siswa.tempat_lahir, formatTanggalLahir(siswa.tanggal_lahir)].filter(Boolean).join(", ");
  const baris: [string, string][] = [
    ["Nama", siswa.nama || "-"],
    ["NIS / NISN", `${siswa.nipd || "-"} / ${siswa.nisn || "-"}`],
    ["TTL.", ttl || "-"],
    ["Jenis Kelamin", labelJk(siswa.jk)],
    ["Alamat", siswa.alamat || "-"],
  ];

  return (
    <div className="relative overflow-hidden break-inside-avoid" style={CARD_STYLE}>
      {profil.template_kartu_pelajar_depan_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={profil.template_kartu_pelajar_depan_url}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-slate-50 border border-slate-300" />
      )}

      <div className="absolute" style={{ left: "4%", top: "35%", width: "16%", height: "26%" }}>
        <FotoPlaceholder />
      </div>

      <div
        className="absolute text-black leading-tight"
        style={{ left: "22%", top: "35%", width: "75%", fontSize: "2.3cqw" }}
      >
        {baris.map(([label, value]) => (
          <div key={label} className="flex mb-[0.4cqw]">
            <span className="w-[20cqw] shrink-0">{label}</span>
            <span className="shrink-0">:</span>
            <span className="pl-[1cqw] min-w-0 flex-1 truncate">{value}</span>
          </div>
        ))}
      </div>

      <div className="absolute" style={{ left: "22%", top: "62%", width: "20%", height: "32%" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrDataUrl} alt="QR" className="w-full h-full object-contain" />
      </div>
    </div>
  );
}

export function KartuPelajarBelakang({ profil }: { profil: ProfilSekolah }) {
  return (
    <div className="relative overflow-hidden break-inside-avoid" style={CARD_STYLE}>
      {profil.template_kartu_pelajar_belakang_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={profil.template_kartu_pelajar_belakang_url}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-slate-50 border border-slate-300" />
      )}
    </div>
  );
}
