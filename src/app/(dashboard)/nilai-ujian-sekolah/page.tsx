"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRole } from "@/lib/role-context";
import { compareKelas } from "@/lib/rekap-siswa";
import { getTahunAjaranSaatIni } from "@/types/nilai";
import {
  SEMUA_KOLOM_UJIAN,
  KolomUjianKey,
  NilaiUjianSekolah,
  JenisUjianSekolah,
} from "@/types/nilai-ujian-sekolah";
import { Loader2, Search } from "lucide-react";

type SiswaRingkas = {
  id: string;
  nama: string | null;
  nisn: string | null;
  rombel: string | null;
  nilai_ujian_sekolah?: NilaiUjianSekolah[];
};

type TabKey = "tertulis" | "praktik" | "laporan";

const TABS: { key: TabKey; label: string }[] = [
  { key: "tertulis", label: "Nilai Ujian Sekolah Tertulis" },
  { key: "praktik", label: "Nilai Ujian Sekolah Praktik" },
  { key: "laporan", label: "Laporan Tertulis + Praktik" },
];

export default function NilaiUjianSekolahPage() {
  const { role, waliKelasRombel, moduleAccess } = useRole();
  const isFullAccessRole = role === "admin" || role === "kepala_sekolah";
  const hasModuleEdit = moduleAccess.some((a) => a.module === "nilai_ujian_sekolah" && a.can_edit);
  const fullSelectAccess = isFullAccessRole || hasModuleEdit;
  const lockedToOwnClass = !fullSelectAccess && Boolean(waliKelasRombel);

  const [activeTab, setActiveTab] = useState<TabKey>("tertulis");
  const [tahunAjaran, setTahunAjaran] = useState(getTahunAjaranSaatIni());
  const [kelasOptions, setKelasOptions] = useState<string[]>([]);
  const [kelasFilter, setKelasFilter] = useState("");
  const [search, setSearch] = useState("");

  const [siswaList, setSiswaList] = useState<SiswaRingkas[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingCell, setSavingCell] = useState<string | null>(null);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bobotUjianSekolah, setBobotUjianSekolah] = useState<number | null>(null);

  // Bobot Nilai Ujian Sekolah dari Pengaturan SKL -- dipakai untuk hitung
  // kolom "Nilai SKL" per mapel di tab Laporan.
  useEffect(() => {
    async function fetchBobot() {
      const supabase = createClient();
      const { data } = await supabase
        .from("pengaturan_skl")
        .select("bobot_ujian_sekolah")
        .eq("id", 1)
        .maybeSingle();
      setBobotUjianSekolah(data?.bobot_ujian_sekolah ?? null);
    }
    fetchBobot();
  }, []);

  // Kunci ke kelas sendiri untuk wali kelas IX yang tidak punya akses penuh
  useEffect(() => {
    if (lockedToOwnClass && waliKelasRombel) setKelasFilter(waliKelasRombel);
  }, [lockedToOwnClass, waliKelasRombel]);

  // Opsi kelas IX untuk combobox filter (cuma untuk yang boleh pilih bebas)
  useEffect(() => {
    if (lockedToOwnClass) return;
    async function fetchKelasOptions() {
      const supabase = createClient();
      const { data } = await supabase
        .from("siswa01")
        .select("rombel")
        .like("rombel", "IX.%")
        .eq("status_siswa", "Aktif");
      const unique = Array.from(
        new Set((data ?? []).map((r) => r.rombel).filter(Boolean) as string[])
      ).sort(compareKelas);
      setKelasOptions(unique);
    }
    fetchKelasOptions();
  }, [lockedToOwnClass]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();

    let query = supabase
      .from("siswa01")
      .select("id, nama, nisn, rombel, nilai_ujian_sekolah(*)")
      .like("rombel", "IX.%")
      .eq("status_siswa", "Aktif")
      .eq("nilai_ujian_sekolah.tahun_ajaran", tahunAjaran)
      .order("nama", { ascending: true });

    if (kelasFilter) query = query.eq("rombel", kelasFilter);

    const { data, error: err } = await query;

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as SiswaRingkas[];
    setSiswaList(rows);

    const newValues: Record<string, string> = {};
    for (const s of rows) {
      for (const row of s.nilai_ujian_sekolah ?? []) {
        for (const k of SEMUA_KOLOM_UJIAN) {
          const v = row[k.key as keyof NilaiUjianSekolah];
          if (v !== null && v !== undefined) {
            newValues[`${s.nisn}_${row.jenis}_${k.key}`] = String(v);
          }
        }
      }
    }
    setValues(newValues);
    setLoading(false);

    // Sinkronkan Nilai SKL (komponen Ujian Sekolah) untuk semua siswa yang
    // baru dimuat, pakai nilai yang baru saja diambil (bukan state `values`
    // yang belum tentu ter-update saat fungsi ini jalan).
    syncNilaiSkl(
      rows.filter((s) => s.nisn).map((s) => s.nisn as string),
      newValues
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tahunAjaran, kelasFilter, bobotUjianSekolah]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function getValue(nisn: string, jenis: JenisUjianSekolah, key: KolomUjianKey): string {
    return values[`${nisn}_${jenis}_${key}`] ?? "";
  }

  function setValue(nisn: string, jenis: JenisUjianSekolah, key: KolomUjianKey, val: string) {
    setValues((prev) => ({ ...prev, [`${nisn}_${jenis}_${key}`]: val }));
  }

  async function saveCell(
    nisn: string,
    rombel: string | null,
    jenis: JenisUjianSekolah,
    key: KolomUjianKey,
    rawValue: string
  ) {
    const cellId = `${nisn}_${jenis}_${key}`;
    const supabase = createClient();
    setSavingCell(cellId);
    setError(null);

    const trimmed = rawValue.trim();

    if (trimmed === "") {
      await supabase
        .from("nilai_ujian_sekolah")
        .update({ [key]: null })
        .eq("nisn", nisn)
        .eq("tahun_ajaran", tahunAjaran)
        .eq("jenis", jenis);
      setSavingCell(null);
      return;
    }

    const num = Number(trimmed);
    if (isNaN(num) || num < 0 || num > 100) {
      setSavingCell(null);
      setError("Nilai harus angka 0-100.");
      return;
    }

    const { error: err } = await supabase
      .from("nilai_ujian_sekolah")
      .upsert(
        { nisn, tahun_ajaran: tahunAjaran, jenis, kelas: rombel, [key]: num },
        { onConflict: "nisn,tahun_ajaran,jenis" }
      );

    setSavingCell(null);
    if (err) {
      setError(err.message);
      return;
    }
    syncNilaiSkl([nisn], { [cellId]: rawValue });
  }

  // Bulat -> tanpa koma; desimal -> 2 digit di belakang koma.
  function formatNilaiSkl(value: number): string {
    const rounded = Math.round(value * 100) / 100;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
  }

  // Nilai SKL mentah (angka) per mapel = AVERAGE(Tertulis, Praktik) x
  // (bobot_ujian_sekolah / 100). Nilai yang kosong tidak ikut dirata-rata;
  // kalau keduanya kosong (atau bobot belum ada), null.
  function hitungNilaiSklRaw(
    vt: number | null | undefined,
    vp: number | null | undefined
  ): number | null {
    const nilaiValid = [vt, vp].filter((v): v is number => v !== null && v !== undefined);
    if (nilaiValid.length === 0 || bobotUjianSekolah === null) return null;
    const rataRata = nilaiValid.reduce((a, b) => a + b, 0) / nilaiValid.length;
    return Math.round(rataRata * (bobotUjianSekolah / 100) * 100) / 100;
  }

  function hitungNilaiSkl(vt: number | null | undefined, vp: number | null | undefined): string {
    const raw = hitungNilaiSklRaw(vt, vp);
    return raw === null ? "-" : formatNilaiSkl(raw);
  }

  // Simpan Nilai SKL (komponen Ujian Sekolah) ke nilai_skl_ujian_sekolah
  // supaya proses berikutnya (gabung dengan komponen Nilai Raport) bisa
  // baca langsung tanpa hitung ulang. `overrideValues` dipakai untuk nilai
  // yang baru saja disimpan tapi state `values` belum tentu ter-render.
  async function syncNilaiSkl(nisnList: string[], overrideValues: Record<string, string> = {}) {
    if (bobotUjianSekolah === null || nisnList.length === 0) return;
    const lookup = { ...values, ...overrideValues };

    const payload = nisnList.map((nisn) => {
      const fields: Record<string, number | null> = {};
      for (const k of SEMUA_KOLOM_UJIAN) {
        const vtStr = lookup[`${nisn}_Tertulis_${k.key}`];
        const vpStr = lookup[`${nisn}_Praktik_${k.key}`];
        const vt = vtStr && vtStr.trim() !== "" ? Number(vtStr) : null;
        const vp = vpStr && vpStr.trim() !== "" ? Number(vpStr) : null;
        fields[k.key] = hitungNilaiSklRaw(vt, vp);
      }
      return { nisn, tahun_ajaran: tahunAjaran, ...fields };
    });

    const supabase = createClient();
    await supabase.from("nilai_skl_ujian_sekolah").upsert(payload, { onConflict: "nisn,tahun_ajaran" });
  }

  // Tempel dari Excel: klipboard berisi banyak baris/kolom dipisah baris
  // baru & tab. Baris/kolom pertama jatuh di sel yang sedang difokus, lalu
  // menyebar ke siswa & mapel berikutnya sesuai urutan tabel.
  async function handlePasteGrid(
    e: React.ClipboardEvent<HTMLInputElement>,
    jenis: JenisUjianSekolah,
    startRowIdx: number,
    startColIdx: number
  ) {
    const text = e.clipboardData.getData("text/plain");
    if (!text.includes("\t") && !text.includes("\n")) return; // satu nilai -- biarkan paste bawaan browser

    e.preventDefault();

    const rows = text
      .replace(/\r/g, "")
      .split("\n")
      .filter((line, i, arr) => !(i === arr.length - 1 && line === ""));

    const perSiswa = new Map<string, { rombel: string | null; fields: Record<string, number | null> }>();
    const localValues: Record<string, string> = {};
    let invalidCount = 0;

    rows.forEach((rowText, rOffset) => {
      const siswa = filteredSiswaList[startRowIdx + rOffset];
      if (!siswa || !siswa.nisn) return;

      const cells = rowText.split("\t");
      cells.forEach((cellText, cOffset) => {
        const kolom = SEMUA_KOLOM_UJIAN[startColIdx + cOffset];
        if (!kolom) return;

        const trimmed = cellText.trim();
        localValues[`${siswa.nisn}_${jenis}_${kolom.key}`] = trimmed;

        const num = trimmed === "" ? null : Number(trimmed);
        if (num !== null && (isNaN(num) || num < 0 || num > 100)) {
          invalidCount += 1;
          return;
        }

        const entry = perSiswa.get(siswa.nisn!) ?? { rombel: siswa.rombel, fields: {} };
        entry.fields[kolom.key] = num;
        perSiswa.set(siswa.nisn!, entry);
      });
    });

    setValues((prev) => ({ ...prev, ...localValues }));

    if (perSiswa.size === 0) return;

    const payload = Array.from(perSiswa.entries()).map(([nisn, { rombel, fields }]) => ({
      nisn,
      tahun_ajaran: tahunAjaran,
      jenis,
      kelas: rombel,
      ...fields,
    }));

    setBulkSaving(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase
      .from("nilai_ujian_sekolah")
      .upsert(payload, { onConflict: "nisn,tahun_ajaran,jenis" });
    setBulkSaving(false);

    if (err) {
      setError(err.message);
      return;
    }
    syncNilaiSkl(Array.from(perSiswa.keys()), localValues);
    if (invalidCount > 0) {
      setError(`${invalidCount} nilai dilewati karena bukan angka 0-100.`);
    }
  }

  const searchTrimmed = search.trim().toLowerCase();
  const filteredSiswaList = searchTrimmed
    ? siswaList.filter(
        (s) =>
          (s.nama || "").toLowerCase().includes(searchTrimmed) ||
          (s.nisn || "").toLowerCase().includes(searchTrimmed)
      )
    : siswaList;

  function renderInputTable(jenis: JenisUjianSekolah) {
    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-x-auto">
        <table className="w-full text-sm whitespace-nowrap">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40 text-left text-slate-500 dark:text-slate-400">
              <th className="px-3 py-2.5 font-medium sticky left-0 bg-slate-50 dark:bg-slate-700/40">No</th>
              <th className="px-3 py-2.5 font-medium sticky left-10 bg-slate-50 dark:bg-slate-700/40 min-w-[180px]">
                Nama
              </th>
              <th className="px-3 py-2.5 font-medium text-center">Kelas</th>
              {SEMUA_KOLOM_UJIAN.map((k) => (
                <th key={k.key} className="px-3 py-2.5 font-medium text-center" title={k.label}>
                  {k.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredSiswaList.map((s, idx) => (
              <tr key={s.id} className="border-b border-slate-100 dark:border-slate-700/60 last:border-0">
                <td className="px-3 py-2 text-slate-500 dark:text-slate-400 sticky left-0 bg-white dark:bg-slate-800">
                  {idx + 1}
                </td>
                <td className="px-3 py-2 font-medium sticky left-10 bg-white dark:bg-slate-800">{s.nama}</td>
                <td className="px-3 py-2 text-center text-slate-500 dark:text-slate-400">{s.rombel || "-"}</td>
                {!s.nisn ? (
                  <td
                    colSpan={SEMUA_KOLOM_UJIAN.length}
                    className="px-3 py-2 text-center text-xs text-amber-600 dark:text-amber-400"
                  >
                    NISN belum diisi — lengkapi dulu di Data Siswa
                  </td>
                ) : (
                  SEMUA_KOLOM_UJIAN.map((k, colIdx) => {
                    const cellId = `${s.nisn}_${jenis}_${k.key}`;
                    return (
                      <td key={k.key} className="px-2 py-1.5 text-center">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={getValue(s.nisn!, jenis, k.key)}
                          onChange={(e) => setValue(s.nisn!, jenis, k.key, e.target.value)}
                          onBlur={(e) => saveCell(s.nisn!, s.rombel, jenis, k.key, e.target.value)}
                          onPaste={(e) => handlePasteGrid(e, jenis, idx, colIdx)}
                          className="w-16 rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 px-2 py-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        {savingCell === cellId && (
                          <Loader2 className="h-3 w-3 animate-spin inline ml-1 text-indigo-400" />
                        )}
                      </td>
                    );
                  })
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  function renderLaporanTable() {
    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-x-auto">
        <table className="w-full text-sm whitespace-nowrap">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40 text-left text-slate-500 dark:text-slate-400">
              <th className="px-3 py-2.5 font-medium sticky left-0 bg-slate-50 dark:bg-slate-700/40">No</th>
              <th className="px-3 py-2.5 font-medium sticky left-10 bg-slate-50 dark:bg-slate-700/40 min-w-[180px]">
                Nama
              </th>
              <th className="px-3 py-2.5 font-medium text-center">Kelas</th>
              {SEMUA_KOLOM_UJIAN.map((k) => (
                <th key={k.key} className="px-3 py-2.5 font-medium text-center" title={k.label}>
                  {k.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredSiswaList.map((s, idx) => (
              <tr key={s.id} className="border-b border-slate-100 dark:border-slate-700/60 last:border-0">
                <td className="px-3 py-2 text-slate-500 dark:text-slate-400 sticky left-0 bg-white dark:bg-slate-800">
                  {idx + 1}
                </td>
                <td className="px-3 py-2 font-medium sticky left-10 bg-white dark:bg-slate-800">{s.nama}</td>
                <td className="px-3 py-2 text-center text-slate-500 dark:text-slate-400">{s.rombel || "-"}</td>
                {SEMUA_KOLOM_UJIAN.map((k) => {
                  // Baca dari state `values` (sama seperti tab Tertulis/Praktik),
                  // bukan data siswaList yang bisa basi kalau baru saja diedit.
                  const vtStr = s.nisn ? getValue(s.nisn, "Tertulis", k.key) : "";
                  const vpStr = s.nisn ? getValue(s.nisn, "Praktik", k.key) : "";
                  const vt = vtStr === "" ? null : Number(vtStr);
                  const vp = vpStr === "" ? null : Number(vpStr);
                  return (
                    <td key={k.key} className="px-2 py-1.5 text-center">
                      {hitungNilaiSkl(vt, vp)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-1">Nilai Ujian Sekolah</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
        Nilai ujian kelulusan (Tertulis &amp; Praktik) untuk siswa kelas IX
      </p>

      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700 mb-5">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === t.key
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama atau NISN..."
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {!lockedToOwnClass && (
          <select
            value={kelasFilter}
            onChange={(e) => setKelasFilter(e.target.value)}
            className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Semua Kelas IX</option>
            {kelasOptions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        )}

        <input
          value={tahunAjaran}
          onChange={(e) => setTahunAjaran(e.target.value)}
          className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm w-32 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="2026/2027"
        />
      </div>

      {bulkSaving && (
        <p className="text-sm text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-lg px-3 py-2 mb-4 inline-flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Menyimpan nilai yang ditempel...
        </p>
      )}

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg px-3 py-2 mb-4">
          {error}
        </p>
      )}

      {loading ? (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-10 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400 dark:text-slate-500" />
        </div>
      ) : filteredSiswaList.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-10 text-center text-slate-400 dark:text-slate-500">
          Tidak ada siswa kelas IX yang cocok.
        </div>
      ) : activeTab === "tertulis" ? (
        renderInputTable("Tertulis")
      ) : activeTab === "praktik" ? (
        renderInputTable("Praktik")
      ) : (
        renderLaporanTable()
      )}
    </div>
  );
}
