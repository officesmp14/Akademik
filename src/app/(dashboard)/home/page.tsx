"use client";

import { useEffect, useState } from "react";
import { buildRekapPerJenjang, buildRekapTotal, RekapRow, SiswaRingkas } from "@/lib/rekap-siswa";
import { JENJANG_PENDIDIKAN_OPTIONS } from "@/types/gtk";
import { Loader2, Users, Users2 } from "lucide-react";

type GtkRingkas = {
  jk: string | null;
  jenis_ptk: string | null;
  status_aktif: string | null;
  jenjang_pendidikan: string | null;
  tanggal_lahir: string | null;
};

const JENIS_PTK_LIST = ["Guru", "Kepala Sekolah", "Tenaga Kependidikan"];

const KELOMPOK_UMUR: { label: string; test: (umur: number) => boolean }[] = [
  { label: "≥ 55 tahun", test: (u) => u >= 55 },
  { label: "50 s.d. 54 tahun", test: (u) => u >= 50 && u <= 54 },
  { label: "45 s.d. 49 tahun", test: (u) => u >= 45 && u <= 49 },
  { label: "36 s.d. 44 tahun", test: (u) => u >= 36 && u <= 44 },
  { label: "31 s.d. 35 tahun", test: (u) => u >= 31 && u <= 35 },
  { label: "25 s.d. 30 tahun", test: (u) => u >= 25 && u <= 30 },
  { label: "≤ 24 tahun", test: (u) => u <= 24 },
];

function hitungUmur(tanggalLahir: string | null | undefined, now: Date): number | null {
  if (!tanggalLahir) return null;
  const lahir = new Date(tanggalLahir);
  if (isNaN(lahir.getTime())) return null;

  let umur = now.getFullYear() - lahir.getFullYear();
  const belumUlangTahun =
    now.getMonth() < lahir.getMonth() ||
    (now.getMonth() === lahir.getMonth() && now.getDate() < lahir.getDate());
  if (belumUlangTahun) umur -= 1;

  return umur;
}

function SiswaTableLP({ rows, total }: { rows: RekapRow[]; total: RekapRow }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
            <th className="px-4 py-2.5 font-medium">KELAS</th>
            <th className="px-4 py-2.5 font-medium text-center">L</th>
            <th className="px-4 py-2.5 font-medium text-center">P</th>
            <th className="px-4 py-2.5 font-medium text-center">JUMLAH</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.kelas} className="border-b border-slate-100">
              <td className="px-4 py-2 font-medium text-slate-800">{r.kelas}</td>
              <td className="px-4 py-2 text-center text-slate-600">{r.l}</td>
              <td className="px-4 py-2 text-center text-slate-600">{r.p}</td>
              <td className="px-4 py-2 text-center text-slate-600">{r.jumlah}</td>
            </tr>
          ))}
          <tr className="bg-slate-50 font-semibold text-slate-800">
            <td className="px-4 py-2.5">TOTAL</td>
            <td className="px-4 py-2.5 text-center">{total.l}</td>
            <td className="px-4 py-2.5 text-center">{total.p}</td>
            <td className="px-4 py-2.5 text-center">{total.jumlah}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function SiswaTableAgama({ rows, total }: { rows: RekapRow[]; total: RekapRow }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
      <table className="w-full text-sm whitespace-nowrap">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
            <th className="px-4 py-2.5 font-medium">KELAS</th>
            <th className="px-4 py-2.5 font-medium text-center">ISLAM</th>
            <th className="px-4 py-2.5 font-medium text-center">KRISTEN</th>
            <th className="px-4 py-2.5 font-medium text-center">KATOLIK</th>
            <th className="px-4 py-2.5 font-medium text-center">HINDU</th>
            <th className="px-4 py-2.5 font-medium text-center">BUDHA</th>
            <th className="px-4 py-2.5 font-medium text-center">KHONGHUCU</th>
            <th className="px-4 py-2.5 font-medium text-center">JUMLAH</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.kelas} className="border-b border-slate-100">
              <td className="px-4 py-2 font-medium text-slate-800">{r.kelas}</td>
              <td className="px-4 py-2 text-center text-slate-600">{r.islam}</td>
              <td className="px-4 py-2 text-center text-slate-600">{r.kristen}</td>
              <td className="px-4 py-2 text-center text-slate-600">{r.katolik}</td>
              <td className="px-4 py-2 text-center text-slate-600">{r.hindu}</td>
              <td className="px-4 py-2 text-center text-slate-600">{r.budha}</td>
              <td className="px-4 py-2 text-center text-slate-600">{r.konghucu}</td>
              <td className="px-4 py-2 text-center text-slate-600">{r.jumlah}</td>
            </tr>
          ))}
          <tr className="bg-slate-50 font-semibold text-slate-800">
            <td className="px-4 py-2.5">TOTAL</td>
            <td className="px-4 py-2.5 text-center">{total.islam}</td>
            <td className="px-4 py-2.5 text-center">{total.kristen}</td>
            <td className="px-4 py-2.5 text-center">{total.katolik}</td>
            <td className="px-4 py-2.5 text-center">{total.hindu}</td>
            <td className="px-4 py-2.5 text-center">{total.budha}</td>
            <td className="px-4 py-2.5 text-center">{total.konghucu}</td>
            <td className="px-4 py-2.5 text-center">{total.jumlah}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [siswa, setSiswa] = useState<SiswaRingkas[]>([]);
  const [gtk, setGtk] = useState<GtkRingkas[]>([]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const res = await fetch("/api/home-stats");
      const json = await res.json();
      if (res.ok) {
        setSiswa(json.siswa ?? []);
        setGtk(json.gtk ?? []);
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  const rekapPerJenjang = buildRekapPerJenjang(siswa);
  const rekapTotalSiswa = buildRekapTotal(siswa);

  const gtkAktif = gtk.filter((g) => g.status_aktif === "Y");
  const totalGtk = gtk.length;
  const totalGtkAktif = gtkAktif.length;
  const totalGtkTidakAktif = gtk.filter((g) => g.status_aktif === "N").length;

  const gtkByJenis = JENIS_PTK_LIST.map((jenis) => {
    const list = gtkAktif.filter((g) => g.jenis_ptk === jenis);
    return {
      jenis,
      l: list.filter((g) => g.jk === "L").length,
      p: list.filter((g) => g.jk === "P").length,
      jumlah: list.length,
    };
  });
  const gtkTanpaJenis = gtkAktif.filter(
    (g) => !g.jenis_ptk || !JENIS_PTK_LIST.includes(g.jenis_ptk)
  ).length;
  const maxJenisJumlah = Math.max(1, ...gtkByJenis.map((g) => g.jumlah));

  const normalizeJenjang = (v: string | null | undefined) => (v ?? "").trim().toLowerCase();

  const gtkByJenjangPendidikan = JENJANG_PENDIDIKAN_OPTIONS.map((jenjang) => ({
    jenjang,
    jumlah: gtkAktif.filter((g) => normalizeJenjang(g.jenjang_pendidikan) === normalizeJenjang(jenjang))
      .length,
  })).filter((j) => j.jumlah > 0);
  const gtkTanpaJenjangPendidikan = gtkAktif.filter(
    (g) =>
      !g.jenjang_pendidikan ||
      !JENJANG_PENDIDIKAN_OPTIONS.some((j) => normalizeJenjang(j) === normalizeJenjang(g.jenjang_pendidikan))
  ).length;
  const maxJenjangPendidikanJumlah = Math.max(1, ...gtkByJenjangPendidikan.map((j) => j.jumlah));

  const now = new Date();
  const gtkAktifUmur = gtkAktif.map((g) => hitungUmur(g.tanggal_lahir, now));
  const gtkByUmur = KELOMPOK_UMUR.map((k) => ({
    label: k.label,
    jumlah: gtkAktifUmur.filter((u) => u !== null && k.test(u)).length,
  })).filter((k) => k.jumlah > 0);
  const gtkTanpaTanggalLahir = gtkAktifUmur.filter((u) => u === null).length;
  const maxUmurJumlah = Math.max(1, ...gtkByUmur.map((k) => k.jumlah));

  return (
    <div className="p-6 md:p-8">
      <h1 className="text-2xl font-semibold text-slate-900 mb-1">Home</h1>
      <p className="text-sm text-slate-500 mb-6">Ringkasan jumlah data siswa dan GTK</p>

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Kolom kiri: Jumlah Data Siswa */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-9 w-9 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                <Users className="h-4.5 w-4.5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Jumlah Data Siswa</p>
                <p className="text-xs text-slate-400">{rekapTotalSiswa.jumlah} siswa aktif</p>
              </div>
            </div>

            <div className="mb-4">
              <SiswaTableLP rows={rekapPerJenjang} total={rekapTotalSiswa} />
            </div>
            <SiswaTableAgama rows={rekapPerJenjang} total={rekapTotalSiswa} />
          </div>

          {/* Kolom kanan: Jumlah Data GTK */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                <Users2 className="h-4.5 w-4.5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Jumlah Data GTK</p>
                <p className="text-xs text-slate-400">{totalGtk} GTK terdaftar</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-xs text-slate-400 mb-1">Total</p>
                <p className="text-2xl font-semibold text-slate-900">{totalGtk}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-xs text-slate-400 mb-1">Aktif</p>
                <p className="text-2xl font-semibold text-emerald-600">{totalGtkAktif}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-xs text-slate-400 mb-1">Tidak Aktif</p>
                <p className="text-2xl font-semibold text-red-500">{totalGtkTidakAktif}</p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
                    <th className="px-4 py-2.5 font-medium">JENIS PTK</th>
                    <th className="px-4 py-2.5 font-medium text-center">L</th>
                    <th className="px-4 py-2.5 font-medium text-center">P</th>
                    <th className="px-4 py-2.5 font-medium text-center">JUMLAH</th>
                  </tr>
                </thead>
                <tbody>
                  {gtkByJenis.map((g) => (
                    <tr key={g.jenis} className="border-b border-slate-100">
                      <td className="px-4 py-2 font-medium text-slate-800">{g.jenis}</td>
                      <td className="px-4 py-2 text-center text-slate-600">{g.l}</td>
                      <td className="px-4 py-2 text-center text-slate-600">{g.p}</td>
                      <td className="px-4 py-2 text-center text-slate-600">{g.jumlah}</td>
                    </tr>
                  ))}
                  {gtkTanpaJenis > 0 && (
                    <tr className="border-b border-slate-100">
                      <td className="px-4 py-2 text-slate-500" colSpan={3}>
                        Belum diisi jenis PTK-nya
                      </td>
                      <td className="px-4 py-2 text-center text-slate-600">{gtkTanpaJenis}</td>
                    </tr>
                  )}
                  <tr className="bg-slate-50 font-semibold text-slate-800">
                    <td className="px-4 py-2.5">TOTAL AKTIF</td>
                    <td className="px-4 py-2.5 text-center">
                      {gtkAktif.filter((g) => g.jk === "L").length}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {gtkAktif.filter((g) => g.jk === "P").length}
                    </td>
                    <td className="px-4 py-2.5 text-center">{totalGtkAktif}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                Distribusi Jenis PTK (Aktif)
              </p>
              <div className="space-y-2.5">
                {gtkByJenis.map((g) => (
                  <div key={g.jenis}>
                    <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                      <span>{g.jenis}</span>
                      <span>{g.jumlah}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${(g.jumlah / maxJenisJumlah) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                Tingkat Pendidikan (Aktif)
              </p>
              {gtkByJenjangPendidikan.length === 0 && gtkTanpaJenjangPendidikan === 0 ? (
                <p className="text-sm text-slate-400">Belum ada data.</p>
              ) : (
                <div className="space-y-2.5">
                  {gtkByJenjangPendidikan.map((j) => (
                    <div key={j.jenjang}>
                      <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                        <span>{j.jenjang}</span>
                        <span>{j.jumlah}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-indigo-500"
                          style={{ width: `${(j.jumlah / maxJenjangPendidikanJumlah) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  {gtkTanpaJenjangPendidikan > 0 && (
                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                        <span>Belum diisi</span>
                        <span>{gtkTanpaJenjangPendidikan}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-slate-300"
                          style={{
                            width: `${(gtkTanpaJenjangPendidikan / maxJenjangPendidikanJumlah) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                Kelompok Umur (Aktif)
              </p>
              {gtkByUmur.length === 0 && gtkTanpaTanggalLahir === 0 ? (
                <p className="text-sm text-slate-400">Belum ada data.</p>
              ) : (
                <div className="space-y-2.5">
                  {gtkByUmur.map((k) => (
                    <div key={k.label}>
                      <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                        <span>{k.label}</span>
                        <span>{k.jumlah}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-amber-500"
                          style={{ width: `${(k.jumlah / maxUmurJumlah) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  {gtkTanpaTanggalLahir > 0 && (
                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                        <span>Belum diisi tanggal lahir</span>
                        <span>{gtkTanpaTanggalLahir}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-slate-300"
                          style={{ width: `${(gtkTanpaTanggalLahir / maxUmurJumlah) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
