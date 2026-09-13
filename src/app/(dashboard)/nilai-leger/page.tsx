"use client";

import { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/client";
import { useRole } from "@/lib/role-context";
import { compareKelas } from "@/lib/rekap-siswa";
import { getTahunAjaranSaatIni, getSemesterSaatIni } from "@/types/nilai";
import { AGAMA_KOLOM, MAPEL_KOLOM, KETIDAKHADIRAN_KOLOM, NilaiLeger } from "@/types/nilai-leger";
import { parseLegerHeader, resolveLegerRows, ImportSummary } from "@/lib/nilai-leger-import";
import { Loader2, Upload, Search } from "lucide-react";

type SiswaRingkas = {
  id: string;
  nama: string | null;
  agama: string | null;
  nisn: string | null;
  nipd: string | null;
  nilai_leger?: NilaiLeger[];
};

type NilaiLegerJoined = NilaiLeger & {
  siswa01: { id: string; nama: string | null; agama: string | null; nisn: string | null; nipd: string | null } | null;
};

/** Tahun ajaran sekarang + 2 tahun ajaran sebelumnya, buat opsi combobox. */
function tahunAjaranOptions(): string[] {
  const [tahunAwal] = getTahunAjaranSaatIni().split("/").map(Number);
  return [0, 1, 2].map((i) => `${tahunAwal - i}/${tahunAwal - i + 1}`);
}

const KOLOM_NILAI = [...AGAMA_KOLOM, ...MAPEL_KOLOM] as const;
const SEMUA_KOLOM = [...KOLOM_NILAI, ...KETIDAKHADIRAN_KOLOM] as const;
type KolomKey = (typeof SEMUA_KOLOM)[number]["key"];

export default function NilaiLegerPage() {
  const { role, waliKelasRombel, moduleAccess } = useRole();
  const isFullAccessRole = role === "admin" || role === "kepala_sekolah";
  const hasModuleEdit = moduleAccess.some((a) => a.module === "nilai_leger" && a.can_edit);
  const fullSelectAccess = isFullAccessRole || hasModuleEdit;
  const lockedToOwnClass = !fullSelectAccess && Boolean(waliKelasRombel);

  const [tahunAjaran, setTahunAjaran] = useState(getTahunAjaranSaatIni());
  const [showTahunDropdown, setShowTahunDropdown] = useState(false);
  const [semester, setSemester] = useState<"Ganjil" | "Genap">(getSemesterSaatIni());
  const [rombelOptions, setRombelOptions] = useState<string[]>([]);
  const [rombel, setRombel] = useState(lockedToOwnClass ? waliKelasRombel ?? "" : "");

  const [siswaList, setSiswaList] = useState<SiswaRingkas[]>([]);
  const [search, setSearch] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingCell, setSavingCell] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [editingSiswa, setEditingSiswa] = useState<SiswaRingkas | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showImportSetup, setShowImportSetup] = useState(false);
  const [importTahunAjaran, setImportTahunAjaran] = useState(tahunAjaran);
  const [importSemester, setImportSemester] = useState<"Ganjil" | "Genap">(semester);
  const [importKelas, setImportKelas] = useState("");
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  const [showKelasIX, setShowKelasIX] = useState(false);
  const [kelasIXFilter, setKelasIXFilter] = useState("");
  const [kelasIXOptions, setKelasIXOptions] = useState<string[]>([]);
  const [kelasIXSiswaList, setKelasIXSiswaList] = useState<
    { id: string; nama: string | null; nisn: string | null; rombel: string | null }[]
  >([]);
  const [kelasIXChecked, setKelasIXChecked] = useState<Set<string>>(new Set());
  const [kelasIXLoading, setKelasIXLoading] = useState(false);
  const [kelasIXError, setKelasIXError] = useState<string | null>(null);
  const [kelasIXProcessing, setKelasIXProcessing] = useState(false);
  const [kelasIXKelasInput, setKelasIXKelasInput] = useState("");
  const [kelasIXSemesterInput, setKelasIXSemesterInput] = useState<"Ganjil" | "Genap">(semester);
  const [kelasIXTahunAjaranInput, setKelasIXTahunAjaranInput] = useState(tahunAjaran);

  useEffect(() => {
    async function fetchDefaultPeriode() {
      const supabase = createClient();
      const { data } = await supabase
        .from("pengaturan_akademik")
        .select("tahun_ajaran, semester")
        .eq("id", 1)
        .maybeSingle();
      if (data) {
        setTahunAjaran(data.tahun_ajaran);
        setSemester(data.semester);
      }
    }
    fetchDefaultPeriode();
  }, []);

  useEffect(() => {
    if (lockedToOwnClass) return;
    async function fetchRombelOptions() {
      const supabase = createClient();
      // Opsi kelas diambil dari nilai_leger.kelas_old untuk tahun ajaran &
      // semester yang dipilih -- bukan rombel siswa01 SEKARANG -- supaya
      // kelas lama yang siswanya sudah naik kelas tetap bisa dipilih.
      const { data } = await supabase
        .from("nilai_leger")
        .select("kelas_old")
        .eq("tahun_ajaran", tahunAjaran)
        .eq("semester", semester)
        .not("kelas_old", "is", null);
      const unique = Array.from(
        new Set((data ?? []).map((r) => r.kelas_old).filter(Boolean) as string[])
      ).sort(compareKelas);
      setRombelOptions(unique);
      setRombel((prev) => (prev && unique.includes(prev) ? prev : unique[0] || ""));
    }
    fetchRombelOptions();
  }, [lockedToOwnClass, tahunAjaran, semester]);

  useEffect(() => {
    async function loadData() {
      if (!rombel) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      const supabase = createClient();

      let siswaRows: SiswaRingkas[];

      if (lockedToOwnClass) {
        // Wali kelas dikunci ke ROSTER siswa SEKARANG (rombel dia), bukan ke
        // satu label kelas_old -- soalnya siswa yang sekarang sekelas bisa
        // saja dulu tersebar di kelas_old yang berbeda-beda (kelas sering
        // diacak ulang tiap kenaikan kelas). Nilai leger tiap siswa untuk
        // tahun ajaran & semester yang dipilih tetap kebawa apa pun
        // kelas_old yang tercatat di baris itu.
        const { data, error: siswaError } = await supabase
          .from("siswa01")
          .select("id, nama, agama, nisn, nipd, nilai_leger(*)")
          .eq("rombel", rombel)
          .eq("status_siswa", "Aktif")
          .eq("nilai_leger.tahun_ajaran", tahunAjaran)
          .eq("nilai_leger.semester", semester);

        if (siswaError) {
          setError(siswaError.message);
          setLoading(false);
          return;
        }
        siswaRows = (data ?? []) as SiswaRingkas[];
      } else {
        // Sumber daftar siswa yang tampil adalah nilai_leger itu sendiri,
        // difilter berdasarkan kelas_old (kelas siswa PADA SAAT nilai ini
        // dicatat) + tahun_ajaran + semester -- bukan rombel siswa01
        // SEKARANG -- supaya leger kelas lama tetap bisa dibuka walau
        // siswanya sudah naik kelas sejak nilai itu dicatat.
        const { data, error: siswaError } = await supabase
          .from("nilai_leger")
          .select("*, siswa01!inner(id, nama, agama, nisn, nipd, status_siswa)")
          .eq("kelas_old", rombel)
          .eq("tahun_ajaran", tahunAjaran)
          .eq("semester", semester)
          .eq("siswa01.status_siswa", "Aktif");

        if (siswaError) {
          setError(siswaError.message);
          setLoading(false);
          return;
        }
        siswaRows = (data as unknown as NilaiLegerJoined[] ?? [])
          .filter((row) => row.siswa01)
          .map((row) => {
            const { siswa01: s, ...nilai } = row;
            return {
              id: s!.id,
              nama: s!.nama,
              agama: s!.agama,
              nisn: s!.nisn,
              nipd: s!.nipd,
              nilai_leger: [nilai as NilaiLeger],
            };
          });
      }

      siswaRows = [...siswaRows].sort((a, b) => (a.nama || "").localeCompare(b.nama || ""));
      setSiswaList(siswaRows);

      const newValues: Record<string, string> = {};
      for (const s of siswaRows) {
        const row = s.nilai_leger?.[0];
        if (!row) continue;
        for (const k of SEMUA_KOLOM) {
          const v = row[k.key as keyof NilaiLeger];
          if (v !== null && v !== undefined) newValues[`${row.nisn}_${k.key}`] = String(v);
        }
      }
      setValues(newValues);
      setLoading(false);
    }
    loadData();
  }, [rombel, tahunAjaran, semester, refreshKey, lockedToOwnClass]);

  function isCellDisabled(siswa: SiswaRingkas, kolom: (typeof SEMUA_KOLOM)[number]): boolean {
    if (!("agama" in kolom)) return false;
    return kolom.agama !== siswa.agama;
  }

  function getValue(nisn: string, key: KolomKey): string {
    return values[`${nisn}_${key}`] ?? "";
  }

  function setValue(nisn: string, key: KolomKey, val: string) {
    setValues((prev) => ({ ...prev, [`${nisn}_${key}`]: val }));
  }

  async function saveCell(nisn: string, key: KolomKey, rawValue: string) {
    const cellId = `${nisn}_${key}`;
    const supabase = createClient();
    setSavingCell(cellId);
    setError(null);

    const isAttendance = KETIDAKHADIRAN_KOLOM.some((k) => k.key === key);
    const trimmed = rawValue.trim();

    if (trimmed === "") {
      await supabase
        .from("nilai_leger")
        .update({ [key]: null })
        .eq("nisn", nisn)
        .eq("tahun_ajaran", tahunAjaran)
        .eq("semester", semester);
      setSavingCell(null);
      return;
    }

    const num = Number(trimmed);
    const invalid = isAttendance ? isNaN(num) || num < 0 : isNaN(num) || num < 0 || num > 100;
    if (invalid) {
      setSavingCell(null);
      setError(isAttendance ? "Jumlah hari harus angka 0 atau lebih." : "Nilai harus angka 0-100.");
      return;
    }

    const { error } = await supabase.from("nilai_leger").upsert(
      { nisn, tahun_ajaran: tahunAjaran, semester, [key]: num },
      { onConflict: "nisn,tahun_ajaran,semester" }
    );

    setSavingCell(null);
    if (error) setError(error.message);
  }

  async function handleImportFile(file: File) {
    setImportError(null);
    setImportSuccess(null);
    setImportSummary(null);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false, defval: "" });

      const parsed = parseLegerHeader(rows);
      if ("error" in parsed) {
        setImportError(parsed.error);
        return;
      }
      if (parsed.columns.every((c) => c.kind === "unknown")) {
        setImportError("Tidak ada kolom mata pelajaran yang dikenali di file ini.");
        return;
      }

      // Cocokkan ke SEMUA siswa (bukan cuma yang di kelas sedang dibuka):
      // leger sering diimpor untuk semester lalu, saat siswanya masih di
      // kelas yang berbeda dari rombel dia sekarang (sudah naik kelas).
      const supabase = createClient();
      const { data: allSiswa, error: siswaError } = await supabase
        .from("siswa01")
        .select("id, nama, agama, nisn, nipd");
      if (siswaError) {
        setImportError(siswaError.message);
        return;
      }

      const summary = resolveLegerRows(parsed, allSiswa ?? []);
      // Kelas manual (kalau diisi) menimpa hasil deteksi otomatis dari file
      // -- berguna kalau baris "Kelas" di file tidak terbaca/tidak ada.
      const kelasOverride = importKelas.trim();
      if (kelasOverride) {
        summary.rows = summary.rows.map((r) => ({ ...r, kelas_old: kelasOverride }));
      }
      setImportSummary(summary);
    } catch (err) {
      setImportError(
        "Gagal membaca file. Pastikan file berformat .xlsx sesuai leger e-Rapor. (" +
          (err instanceof Error ? err.message : String(err)) +
          ")"
      );
    }
  }

  async function handleConfirmImport() {
    if (!importSummary || importSummary.rows.length === 0) return;
    setImporting(true);
    const supabase = createClient();

    const payload = importSummary.rows.map((r) => ({
      ...r,
      tahun_ajaran: importTahunAjaran,
      semester: importSemester,
    }));

    const CHUNK_SIZE = 100;
    for (let i = 0; i < payload.length; i += CHUNK_SIZE) {
      const chunk = payload.slice(i, i + CHUNK_SIZE);
      const { error } = await supabase
        .from("nilai_leger")
        .upsert(chunk, { onConflict: "nisn,tahun_ajaran,semester" });
      if (error) {
        setImportError(error.message);
        setImporting(false);
        return;
      }
    }

    setImporting(false);
    setImportSuccess(
      `Berhasil menyimpan data untuk ${importSummary.matched.length} siswa ` +
        `(${importSemester} ${importTahunAjaran}). Untuk melihatnya, buka kelas siswa itu SEKARANG ` +
        `dengan tahun ajaran & semester yang sama seperti di atas.`
    );
    setImportSummary(null);
    if (importTahunAjaran === tahunAjaran && importSemester === semester) {
      setRefreshKey((k) => k + 1);
    }
  }

  async function openKelasIX() {
    setShowKelasIX(true);
    setKelasIXError(null);
    setKelasIXChecked(new Set());
    setKelasIXKelasInput("");
    setKelasIXSemesterInput(semester);
    setKelasIXTahunAjaranInput(tahunAjaran);
    setKelasIXLoading(true);

    const supabase = createClient();
    const { data, error } = await supabase
      .from("siswa01")
      .select("id, nama, nisn, rombel")
      .like("rombel", "IX.%")
      .eq("status_siswa", "Aktif")
      .order("nama", { ascending: true });

    if (error) {
      setKelasIXError(error.message);
      setKelasIXLoading(false);
      return;
    }

    setKelasIXSiswaList(data ?? []);
    const uniqueRombel = Array.from(
      new Set((data ?? []).map((s) => s.rombel).filter(Boolean) as string[])
    ).sort(compareKelas);
    setKelasIXOptions(uniqueRombel);
    setKelasIXLoading(false);
  }

  const kelasIXFiltered = kelasIXFilter
    ? kelasIXSiswaList.filter((s) => s.rombel === kelasIXFilter)
    : kelasIXSiswaList;

  function toggleKelasIXChecked(id: string) {
    setKelasIXChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleKelasIXCheckAll() {
    const visibleIds = kelasIXFiltered.map((s) => s.id);
    const allChecked = visibleIds.length > 0 && visibleIds.every((id) => kelasIXChecked.has(id));
    setKelasIXChecked((prev) => {
      const next = new Set(prev);
      visibleIds.forEach((id) => (allChecked ? next.delete(id) : next.add(id)));
      return next;
    });
  }

  async function handleBuatBarisKosong() {
    const dipilih = kelasIXSiswaList.filter((s) => kelasIXChecked.has(s.id));
    if (dipilih.length === 0) return;

    setKelasIXProcessing(true);
    setKelasIXError(null);
    const supabase = createClient();

    const kelasOverride = kelasIXKelasInput.trim();
    const tanpaNisn = dipilih.filter((s) => !s.nisn);
    const payload = dipilih
      .filter((s) => s.nisn)
      .map((s) => ({
        nisn: s.nisn as string,
        tahun_ajaran: kelasIXTahunAjaranInput,
        semester: kelasIXSemesterInput,
        kelas_old: kelasOverride || s.rombel,
      }));

    if (payload.length > 0) {
      const { error } = await supabase
        .from("nilai_leger")
        .upsert(payload, { onConflict: "nisn,tahun_ajaran,semester", ignoreDuplicates: true });
      if (error) {
        setKelasIXError(error.message);
        setKelasIXProcessing(false);
        return;
      }
    }

    setKelasIXProcessing(false);
    setShowKelasIX(false);
    setImportSuccess(
      `Berhasil membuat baris kosong nilai leger untuk ${payload.length} siswa ` +
        `(${kelasIXSemesterInput} ${kelasIXTahunAjaranInput})` +
        (tanpaNisn.length > 0
          ? `. ${tanpaNisn.length} siswa dilewati karena NISN belum diisi: ${tanpaNisn
              .map((s) => s.nama)
              .join(", ")}.`
          : ".")
    );
    if (kelasIXTahunAjaranInput === tahunAjaran && kelasIXSemesterInput === semester) {
      setRefreshKey((k) => k + 1);
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

  return (
    <div className="p-6 md:p-8">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-1">Nilai Leger</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
        Nilai akhir rapor &amp; ketidakhadiran per siswa, disalin dari aplikasi e-Rapor Kemendikbud
        {lockedToOwnClass && (
          <>
            {" "}
            — Kelas <strong>{waliKelasRombel}</strong>
          </>
        )}
      </p>

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
            value={rombel}
            onChange={(e) => setRombel(e.target.value)}
            className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">-- Pilih Kelas --</option>
            {rombelOptions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        )}

        <select
          value={semester}
          onChange={(e) => setSemester(e.target.value as "Ganjil" | "Genap")}
          className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="Ganjil">Semester Ganjil</option>
          <option value="Genap">Semester Genap</option>
        </select>

        <div className="relative">
          <input
            value={tahunAjaran}
            onChange={(e) => setTahunAjaran(e.target.value)}
            onFocus={() => setShowTahunDropdown(true)}
            onBlur={() => setTimeout(() => setShowTahunDropdown(false), 150)}
            className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm w-32 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="2026/2027"
          />
          {showTahunDropdown && (
            <div className="absolute z-10 mt-1 w-32 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-lg overflow-hidden">
              {tahunAjaranOptions().map((ta) => (
                <button
                  key={ta}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setTahunAjaran(ta);
                    setShowTahunDropdown(false);
                  }}
                  className="block w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  {ta}
                </button>
              ))}
            </div>
          )}
        </div>

        {!lockedToOwnClass && (
          <>
            <button
              onClick={() => {
                setImportTahunAjaran(tahunAjaran);
                setImportSemester(semester);
                setImportKelas(rombel);
                setShowImportSetup(true);
              }}
              disabled={!rombel}
              className="inline-flex items-center gap-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              <Upload className="h-4 w-4" />
              Import dari Excel (e-Rapor)
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImportFile(file);
                e.target.value = "";
              }}
            />

            <button
              onClick={openKelasIX}
              className="inline-flex items-center gap-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <Upload className="h-4 w-4" />
              Impor dari Kelas IX Saat Ini
            </button>
          </>
        )}
      </div>

      {importSuccess && (
        <p className="text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-lg px-3 py-2 mb-4">
          {importSuccess}
        </p>
      )}

      {importError && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg px-3 py-2 mb-4">
          {importError}
        </p>
      )}

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg px-3 py-2 mb-4">
          {error}
        </p>
      )}

      {!rombel ? (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-10 text-center text-slate-400 dark:text-slate-500">
          Pilih kelas terlebih dahulu.
        </div>
      ) : loading ? (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-10 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400 dark:text-slate-500" />
        </div>
      ) : siswaList.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-10 text-center text-slate-400 dark:text-slate-500">
          {lockedToOwnClass
            ? "Tidak ada siswa aktif di kelas ini."
            : (
              <>
                Belum ada data nilai leger untuk kelas, tahun ajaran, dan semester ini. Import dari
                Excel dulu, atau pakai tombol &quot;Impor dari Kelas IX Saat Ini&quot; untuk buat baris
                kosong.
              </>
            )}
        </div>
      ) : filteredSiswaList.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-10 text-center text-slate-400 dark:text-slate-500">
          Tidak ada siswa yang cocok dengan pencarian &quot;{search}&quot;.
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40 text-left text-slate-500 dark:text-slate-400">
                <th className="px-3 py-2.5 font-medium sticky left-0 bg-slate-50 dark:bg-slate-700/40">No</th>
                <th className="px-3 py-2.5 font-medium sticky left-10 bg-slate-50 dark:bg-slate-700/40 min-w-[180px]">
                  Nama
                </th>
                <th className="px-3 py-2.5 font-medium text-center" title="Kelas siswa pada saat nilai ini dicatat">
                  Kelas (saat itu)
                </th>
                {SEMUA_KOLOM.map((k) => (
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
                  <td className="px-3 py-2 font-medium sticky left-10 bg-white dark:bg-slate-800">
                    <button
                      type="button"
                      onClick={() => setEditingSiswa(s)}
                      className="text-indigo-600 dark:text-indigo-400 hover:underline text-left"
                    >
                      {s.nama}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-center text-slate-500 dark:text-slate-400">
                    {s.nilai_leger?.[0]?.kelas_old || "-"}
                  </td>
                  {!s.nisn ? (
                    <td
                      colSpan={SEMUA_KOLOM.length}
                      className="px-3 py-2 text-center text-xs text-amber-600 dark:text-amber-400"
                    >
                      NISN belum diisi — lengkapi dulu di Data Siswa
                    </td>
                  ) : (
                    SEMUA_KOLOM.map((k) => {
                      const disabled = isCellDisabled(s, k);
                      const cellId = `${s.nisn}_${k.key}`;
                      return (
                        <td key={k.key} className="px-2 py-1.5 text-center">
                          {disabled ? (
                            <span className="text-slate-300 dark:text-slate-600">-</span>
                          ) : (
                            <>
                              <input
                                type="number"
                                min={0}
                                max={KETIDAKHADIRAN_KOLOM.some((a) => a.key === k.key) ? undefined : 100}
                                value={getValue(s.nisn!, k.key)}
                                onChange={(e) => setValue(s.nisn!, k.key, e.target.value)}
                                onBlur={(e) => saveCell(s.nisn!, k.key, e.target.value)}
                                className="w-16 rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 px-2 py-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                              {savingCell === cellId && (
                                <Loader2 className="h-3 w-3 animate-spin inline ml-1 text-indigo-400" />
                              )}
                            </>
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
      )}

      {editingSiswa && editingSiswa.nisn && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-lg w-full shadow-xl max-h-[85vh] overflow-y-auto">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
              Edit Nilai — {editingSiswa.nama}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              NISN {editingSiswa.nisn} · Kelas (saat itu):{" "}
              {editingSiswa.nilai_leger?.[0]?.kelas_old || "-"} · {semester} {tahunAjaran}
            </p>

            <div className="space-y-5 mb-2">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Agama</p>
                <div className="grid grid-cols-2 gap-3">
                  {AGAMA_KOLOM.map((k) => {
                    const disabled = isCellDisabled(editingSiswa, k);
                    return (
                      <label key={k.key} className="text-xs text-slate-600 dark:text-slate-300">
                        {k.label}
                        <input
                          type="number"
                          min={0}
                          max={100}
                          disabled={disabled}
                          value={disabled ? "" : getValue(editingSiswa.nisn!, k.key)}
                          onChange={(e) => setValue(editingSiswa.nisn!, k.key, e.target.value)}
                          onBlur={(e) => saveCell(editingSiswa.nisn!, k.key, e.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 dark:disabled:bg-slate-800 disabled:text-slate-300"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Mata Pelajaran</p>
                <div className="grid grid-cols-3 gap-3">
                  {MAPEL_KOLOM.map((k) => (
                    <label key={k.key} className="text-xs text-slate-600 dark:text-slate-300">
                      {k.label}
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={getValue(editingSiswa.nisn!, k.key)}
                        onChange={(e) => setValue(editingSiswa.nisn!, k.key, e.target.value)}
                        onBlur={(e) => saveCell(editingSiswa.nisn!, k.key, e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Ketidakhadiran</p>
                <div className="grid grid-cols-3 gap-3">
                  {KETIDAKHADIRAN_KOLOM.map((k) => (
                    <label key={k.key} className="text-xs text-slate-600 dark:text-slate-300">
                      {k.label}
                      <input
                        type="number"
                        min={0}
                        value={getValue(editingSiswa.nisn!, k.key)}
                        onChange={(e) => setValue(editingSiswa.nisn!, k.key, e.target.value)}
                        onBlur={(e) => saveCell(editingSiswa.nisn!, k.key, e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {savingCell?.startsWith(`${editingSiswa.nisn}_`) && (
              <p className="text-xs text-indigo-500 flex items-center gap-1 mb-2">
                <Loader2 className="h-3 w-3 animate-spin" /> Menyimpan...
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingSiswa(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                Batal
              </button>
              <button
                onClick={() => setEditingSiswa(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {showImportSetup && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Import dari Excel</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Nilai ini untuk tahun ajaran &amp; semester berapa? (boleh beda dari yang sedang
              ditampilkan di halaman, misalnya kalau meng-import leger tahun lalu)
            </p>

            <div className="space-y-4 mb-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                  Tahun Ajaran
                </label>
                <input
                  value={importTahunAjaran}
                  onChange={(e) => setImportTahunAjaran(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="2026/2027"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                  Semester
                </label>
                <select
                  value={importSemester}
                  onChange={(e) => setImportSemester(e.target.value as "Ganjil" | "Genap")}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Ganjil">Semester Ganjil</option>
                  <option value="Genap">Semester Genap</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                  Kelas (saat itu)
                </label>
                <input
                  value={importKelas}
                  onChange={(e) => setImportKelas(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="VII.1"
                />
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  Kosongkan untuk pakai kelas yang terbaca otomatis dari file.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowImportSetup(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  setShowImportSetup(false);
                  fileInputRef.current?.click();
                }}
                disabled={!importTahunAjaran.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white text-sm font-medium px-4 py-2 hover:bg-indigo-700 disabled:opacity-60"
              >
                <Upload className="h-4 w-4" />
                Pilih File Excel
              </button>
            </div>
          </div>
        </div>
      )}

      {importSummary && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-lg w-full shadow-xl max-h-[85vh] overflow-y-auto">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Pratinjau Import</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Periksa dulu sebelum disimpan sebagai nilai <strong>{importSemester} {importTahunAjaran}</strong>.
            </p>

            <div className="space-y-3 mb-5">
              <p className="text-sm text-slate-700 dark:text-slate-200">
                <strong>{importSummary.matched.length}</strong> siswa cocok (NISN/NIS ditemukan) siap
                disimpan.
              </p>

              {importSummary.rows[0]?.kelas_old && (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Kelas yang dicatat: <strong>{importSummary.rows[0].kelas_old}</strong>{" "}
                  (tersimpan sebagai &quot;Kelas (saat itu)&quot; per siswa).
                </p>
              )}

              {importSummary.unmatched.length > 0 && (
                <div className="text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg px-3 py-2">
                  <p className="font-medium mb-1">
                    {importSummary.unmatched.length} baris tidak ketemu siswanya (dilewati):
                  </p>
                  <ul className="list-disc list-inside">
                    {importSummary.unmatched.map((u) => (
                      <li key={u.rowNumber}>
                        Baris {u.rowNumber}: {u.nama || "(nama kosong)"} — NISN {u.nisn || "-"} (
                        {u.reason})
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {importSummary.unknownColumns.length > 0 && (
                <div className="text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg px-3 py-2">
                  <p className="font-medium">
                    Kolom tidak dikenali (dilewati): {importSummary.unknownColumns.join(", ")}
                  </p>
                </div>
              )}

              {importSummary.duplicateNisn.length > 0 && (
                <div className="text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg px-3 py-2">
                  <p className="font-medium">
                    {importSummary.duplicateNisn.length} NISN muncul di lebih dari satu baris file —
                    otomatis digabung jadi satu (NISN: {importSummary.duplicateNisn.join(", ")}).
                  </p>
                </div>
              )}

              {importSummary.rows.length === 0 && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  Tidak ada data yang bisa diimpor dari file ini.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setImportSummary(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={importing || importSummary.rows.length === 0}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white text-sm font-medium px-4 py-2 hover:bg-indigo-700 disabled:opacity-60"
              >
                {importing && <Loader2 className="h-4 w-4 animate-spin" />}
                Konfirmasi Import
              </button>
            </div>
          </div>
        </div>
      )}

      {showKelasIX && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-2xl w-full shadow-xl max-h-[85vh] overflow-y-auto flex flex-col">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
              Impor dari Kelas IX Saat Ini
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Pilih siswa kelas IX untuk dibuatkan baris nilai leger kosong ({semester} {tahunAjaran}
              ), siap diisi manual. Siswa yang sudah punya baris untuk periode ini tidak akan
              tertimpa.
            </p>

            <div className="mb-3">
              <select
                value={kelasIXFilter}
                onChange={(e) => setKelasIXFilter(e.target.value)}
                className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Semua Kelas IX</option>
                {kelasIXOptions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {kelasIXError && (
              <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg px-3 py-2 mb-3">
                {kelasIXError}
              </p>
            )}

            <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-y-auto flex-1 mb-4" style={{ maxHeight: "50vh" }}>
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50 dark:bg-slate-700/40">
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-left text-slate-500 dark:text-slate-400">
                    <th className="px-3 py-2 font-medium w-10">
                      <input
                        type="checkbox"
                        checked={
                          kelasIXFiltered.length > 0 &&
                          kelasIXFiltered.every((s) => kelasIXChecked.has(s.id))
                        }
                        onChange={toggleKelasIXCheckAll}
                        className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500"
                      />
                    </th>
                    <th className="px-3 py-2 font-medium w-12">No</th>
                    <th className="px-3 py-2 font-medium">NISN</th>
                    <th className="px-3 py-2 font-medium">Nama Siswa</th>
                    <th className="px-3 py-2 font-medium">Kelas</th>
                  </tr>
                </thead>
                <tbody>
                  {kelasIXLoading ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-slate-400 dark:text-slate-500">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                      </td>
                    </tr>
                  ) : kelasIXFiltered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-slate-400 dark:text-slate-500">
                        Tidak ada siswa.
                      </td>
                    </tr>
                  ) : (
                    kelasIXFiltered.map((s, idx) => (
                      <tr key={s.id} className="border-b border-slate-100 dark:border-slate-700/60 last:border-0 hover:bg-slate-50/60 dark:hover:bg-slate-700/60">
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={kelasIXChecked.has(s.id)}
                            onChange={() => toggleKelasIXChecked(s.id)}
                            className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="px-3 py-2 text-slate-500 dark:text-slate-400">{idx + 1}</td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{s.nisn || "-"}</td>
                        <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-200">{s.nama || "-"}</td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{s.rombel || "-"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Kelas
                </label>
                <input
                  value={kelasIXKelasInput}
                  onChange={(e) => setKelasIXKelasInput(e.target.value)}
                  placeholder={
                    Array.from(
                      new Set(
                        kelasIXSiswaList
                          .filter((s) => kelasIXChecked.has(s.id))
                          .map((s) => s.rombel)
                          .filter(Boolean)
                      )
                    ).join(", ") || "IX.1"
                  }
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Semester
                </label>
                <select
                  value={kelasIXSemesterInput}
                  onChange={(e) => setKelasIXSemesterInput(e.target.value as "Ganjil" | "Genap")}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Ganjil">Ganjil</option>
                  <option value="Genap">Genap</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Tahun Ajaran
                </label>
                <input
                  value={kelasIXTahunAjaranInput}
                  onChange={(e) => setKelasIXTahunAjaranInput(e.target.value)}
                  placeholder="2026/2027"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">
              Kosongkan Kelas untuk pakai kelas asli masing-masing siswa yang dicentang.
            </p>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowKelasIX(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                Batal
              </button>
              <button
                onClick={handleBuatBarisKosong}
                disabled={kelasIXProcessing || kelasIXChecked.size === 0}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white text-sm font-medium px-4 py-2 hover:bg-indigo-700 disabled:opacity-60"
              >
                {kelasIXProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
                Buat Baris Kosong ({kelasIXChecked.size} siswa)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
