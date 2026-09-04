"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/client";
import { useRole } from "@/lib/role-context";
import { compareKelas } from "@/lib/rekap-siswa";
import { ProfilSekolah } from "@/types/sekolah";
import { KartuPelajarDepan, KartuPelajarBelakang, SiswaKartu } from "@/components/kartu-pelajar/KartuPelajarSide";
import { Search, Loader2, IdCard, Printer } from "lucide-react";

type SiswaRow = SiswaKartu & { id: string };

export default function KartuPelajarPage() {
  const { role, waliKelasRombel } = useRole();
  const isFullAccessRole = role === "admin" || role === "kepala_sekolah";
  const lockedToOwnClass = !isFullAccessRole && Boolean(waliKelasRombel);

  const [profil, setProfil] = useState<ProfilSekolah | null>(null);
  const [siswaList, setSiswaList] = useState<SiswaRow[]>([]);
  const [rombelOptions, setRombelOptions] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [filterRombel, setFilterRombel] = useState("");
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [printData, setPrintData] = useState<{ siswa: SiswaRow; qrDataUrl: string }[] | null>(null);
  const [printLoading, setPrintLoading] = useState(false);

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      setError(null);
      const supabase = createClient();

      let siswaQuery = supabase
        .from("siswa01")
        .select("id, nama, nipd, nisn, rombel, tempat_lahir, tanggal_lahir, jk, alamat")
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
      setSiswaList((siswaData ?? []) as SiswaRow[]);

      if (!lockedToOwnClass) {
        const unique = Array.from(
          new Set((siswaData ?? []).map((s) => s.rombel).filter(Boolean) as string[])
        ).sort(compareKelas);
        setRombelOptions(unique);
      }

      setLoading(false);
    }
    fetchAll();
  }, [lockedToOwnClass, waliKelasRombel]);

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

  function toggleCheckAllVisible() {
    const visibleIds = filteredSiswa.map((s) => s.id);
    const allChecked = visibleIds.length > 0 && visibleIds.every((id) => checkedIds.has(id));
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (allChecked) {
        visibleIds.forEach((id) => next.delete(id));
      } else {
        visibleIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }

  async function handlePrint() {
    if (checkedIds.size === 0) {
      setError("Pilih minimal satu siswa terlebih dahulu.");
      return;
    }
    setError(null);
    setPrintLoading(true);

    const dipilih = siswaList.filter((s) => checkedIds.has(s.id));
    const hasil = await Promise.all(
      dipilih.map(async (siswa) => ({
        siswa,
        qrDataUrl: await QRCode.toDataURL(siswa.nisn || siswa.id, { width: 300, margin: 1 }),
      }))
    );

    setPrintData(hasil);
    setPrintLoading(false);
    setTimeout(() => window.print(), 500);
  }

  const allVisibleChecked =
    filteredSiswa.length > 0 && filteredSiswa.every((s) => checkedIds.has(s.id));

  return (
    <>
      <div className="p-6 md:p-8 dark:bg-slate-900 print:hidden">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Kartu Pelajar</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {lockedToOwnClass && (
                <>
                  Wali Kelas <strong>{waliKelasRombel}</strong> &middot;{" "}
                </>
              )}
              Pilih siswa, lalu cetak kartu pelajar sisi depan &amp; belakang
            </p>
          </div>
          <button
            onClick={handlePrint}
            disabled={printLoading || checkedIds.size === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white text-sm font-medium px-4 py-2.5 hover:bg-indigo-700 transition-colors disabled:opacity-60 shrink-0"
          >
            {printLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
            Cetak Kartu Pelajar ({checkedIds.size} dipilih)
          </button>
        </div>

        {!profil?.template_kartu_pelajar_depan_url && (
          <p className="text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg px-3 py-2 mb-4">
            Template kartu pelajar sisi depan belum diupload. Upload dulu lewat menu Profil Sekolah.
          </p>
        )}

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg px-3 py-2 mb-4">
            {error}
          </p>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama atau NISN..."
              className="w-full sm:w-72 rounded-lg border border-slate-300 dark:border-slate-600 pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {!lockedToOwnClass && (
            <select
              value={filterRombel}
              onChange={(e) => setFilterRombel(e.target.value)}
              className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Semua Kelas</option>
              {rombelOptions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-700/40">
                <tr className="border-b border-slate-200 dark:border-slate-700 text-left text-slate-500 dark:text-slate-400">
                  <th className="px-4 py-3 font-medium w-14">
                    <input
                      type="checkbox"
                      checked={allVisibleChecked}
                      onChange={toggleCheckAllVisible}
                      className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500"
                    />
                  </th>
                  <th className="px-4 py-3 font-medium w-12">No</th>
                  <th className="px-4 py-3 font-medium">Nama</th>
                  <th className="px-4 py-3 font-medium">NIS</th>
                  <th className="px-4 py-3 font-medium">NISN</th>
                  <th className="px-4 py-3 font-medium">Kelas</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : filteredSiswa.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500">
                      <IdCard className="h-6 w-6 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                      Tidak ada siswa yang cocok.
                    </td>
                  </tr>
                ) : (
                  filteredSiswa.map((s, idx) => (
                    <tr key={s.id} className="border-b border-slate-100 dark:border-slate-700/60 last:border-0 hover:bg-slate-50/60 dark:hover:bg-slate-700/60">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={checkedIds.has(s.id)}
                          onChange={() => toggleChecked(s.id)}
                          className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{idx + 1}</td>
                      <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{s.nama || "-"}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{s.nipd || "-"}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{s.nisn || "-"}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{s.rombel || "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {printData && profil && (
        <div className="hidden print:block">
          <style>{`@page { size: A4 portrait; margin: 10mm; }`}</style>
          <div className="flex flex-col gap-4">
            {printData.map(({ siswa, qrDataUrl }) => (
              <div key={siswa.id} className="flex flex-row gap-4 break-inside-avoid">
                <KartuPelajarDepan
                  profil={profil}
                  siswa={siswa}
                  qrDataUrl={qrDataUrl}
                />
                <KartuPelajarBelakang profil={profil} />
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
