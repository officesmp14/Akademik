"use client";

import { useCallback, useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/client";
import { useModulePermission, useRole } from "@/lib/role-context";
import { Download, Loader2, Printer } from "lucide-react";

type Row = {
  id: string;
  nisn: string;
  nik: string | null;
  nama: string;
  nama_ibu: string | null;
  nama_ayah: string | null;
  nama_wali: string | null;
  kode_kelurahan: string | null;
  kode_kecamatan: string | null;
};

const JUDUL = "LAMPIRAN SK USULAN PENERIMA BANTUAN BIAYA PENDIDIKAN TAHUN 2026 BERDASARKAN SKALA PRIORITAS";

// NAMA ORTU: nama ibu; kalau kosong ayah, lalu wali
const namaOrtu = (r: Row) => r.nama_ibu || r.nama_ayah || r.nama_wali || "";

export default function LapBbpPage() {
  const { canEdit: canEditModule } = useModulePermission("data_pip");
  const { role } = useRole();
  const canEdit = role === "admin" || role === "kepala_sekolah" || canEditModule;

  const [data, setData] = useState<Row[]>([]);
  const [alamatByNisn, setAlamatByNisn] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pesan, setPesan] = useState<string | null>(null);
  const [massalKel, setMassalKel] = useState("");
  const [massalKec, setMassalKec] = useState("");
  const [menyimpan, setMenyimpan] = useState(false);
  const [kelurahanByNisn, setKelurahanByNisn] = useState<Record<string, string>>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("pip_siswa")
      .select("id, nisn, nik, nama, nama_ibu, nama_ayah, nama_wali, kode_kelurahan, kode_kecamatan")
      .eq("terseleksi", true)
      .order("kelas_seleksi", { ascending: true })
      .order("nama", { ascending: true });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    const rows = (data ?? []) as Row[];
    setData(rows);

    // Alamat dari data siswa (siswa01) lewat NISN -- kalau tidak terbaca, dibiarkan kosong
    const peta: Record<string, string> = {};
    const petaKel: Record<string, string> = {};
    const nisnList = rows.map((r) => r.nisn);
    for (let i = 0; i < nisnList.length; i += 100) {
      const { data: siswa } = await supabase
        .from("siswa01")
        .select("nisn, alamat, rt, kelurahan, kecamatan")
        .in("nisn", nisnList.slice(i, i + 100));
      for (const s of siswa ?? []) {
        if (!s.nisn) continue;
        if (s.kelurahan) petaKel[s.nisn] = s.kelurahan;
        peta[s.nisn] = [s.alamat, s.rt ? `RT ${s.rt}` : null, s.kelurahan, s.kecamatan]
          .filter(Boolean)
          .join(", ");
      }
    }
    setAlamatByNisn(peta);
    setKelurahanByNisn(petaKel);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function simpanKode(row: Row, patch: Partial<Row>) {
    setError(null);
    const supabase = createClient();
    const { data: hasil, error } = await supabase
      .from("pip_siswa")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", row.id)
      .select("id");
    if (error) {
      setError(
        error.message.includes("kode_") ? "Kolom kode belum ada -- jalankan supabase/pip-siswa-kolom-bbp.sql." : error.message
      );
      return;
    }
    if (!hasil || hasil.length === 0) {
      setError("Perubahan tidak tersimpan -- akun ini belum punya izin ubah (modul Data PIP).");
      return;
    }
    setData((prev) => prev.map((r) => (r.id === row.id ? { ...r, ...patch } : r)));
  }

  // Isi kode yang sama untuk SEMUA siswa terseleksi yang kodenya masih kosong
  async function isiMassal() {
    const kel = massalKel.trim();
    const kec = massalKec.trim();
    if (!kel && !kec) return;
    setMenyimpan(true);
    setError(null);
    setPesan(null);
    const supabase = createClient();
    let jumlah = 0;
    for (const r of data) {
      const patch: Partial<Row> = {};
      if (kel && !r.kode_kelurahan) patch.kode_kelurahan = kel;
      if (kec && !r.kode_kecamatan) patch.kode_kecamatan = kec;
      if (Object.keys(patch).length === 0) continue;
      const { data: hasil, error } = await supabase
        .from("pip_siswa")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", r.id)
        .select("id");
      if (error || !hasil || hasil.length === 0) {
        setError(error?.message ?? "Perubahan tidak tersimpan -- akun ini belum punya izin ubah.");
        break;
      }
      jumlah++;
    }
    setMenyimpan(false);
    if (jumlah > 0) setPesan(`Kode diisi untuk ${jumlah} siswa (yang sebelumnya kosong).`);
    fetchData();
  }

  // Samakan penulisan nama kelurahan di data siswa ("Desa/Kel. Karang Anyar", "KARANG ANYAR") dengan referensi
  const normalisasi = (s: string) =>
    s
      .toLowerCase()
      .replace(/desa\/kel\.?|kelurahan|kel\./g, "")
      .replace(/[^a-z0-9]/g, "");

  // Isi kode kecamatan (dan kode kelurahan kalau sudah diisi di referensi) dari nama
  // kelurahan siswa. Hanya mengisi yang masih kosong.
  async function isiDariReferensi() {
    setMenyimpan(true);
    setError(null);
    setPesan(null);
    const supabase = createClient();
    const [kecRes, kelRes] = await Promise.all([
      supabase.from("ref_kecamatan").select("kode, nama"),
      supabase.from("ref_kelurahan").select("kecamatan_kode, nama, kode"),
    ]);
    if (kecRes.error || kelRes.error) {
      setMenyimpan(false);
      setError("Referensi kecamatan belum ada -- jalankan supabase/ref-wilayah-tarakan.sql.");
      return;
    }
    const peta = new Map((kelRes.data ?? []).map((k) => [normalisasi(k.nama), k]));
    let terisi = 0;
    let tidakCocok = 0;
    for (const r of data) {
      const namaKel = kelurahanByNisn[r.nisn];
      const ref = namaKel ? peta.get(normalisasi(namaKel)) : undefined;
      if (!ref) {
        tidakCocok++;
        continue;
      }
      const patch: Partial<Row> = {};
      if (!r.kode_kecamatan) patch.kode_kecamatan = ref.kecamatan_kode;
      if (!r.kode_kelurahan && ref.kode) patch.kode_kelurahan = ref.kode;
      if (Object.keys(patch).length === 0) continue;
      const { data: hasil, error } = await supabase
        .from("pip_siswa")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", r.id)
        .select("id");
      if (error || !hasil || hasil.length === 0) {
        setError(error?.message ?? "Perubahan tidak tersimpan -- akun ini belum punya izin ubah.");
        break;
      }
      terisi++;
    }
    setMenyimpan(false);
    setPesan(
      `Kode diisi untuk ${terisi} siswa. ${tidakCocok} siswa dilewati karena kelurahannya tidak ada di referensi (cek data siswa).`
    );
    fetchData();
  }

  function buatSheet() {
    // Tata letak mengikuti "format BBP 2026.xlsx": judul di B2, header di baris 3 mulai kolom B
    const aoa: (string | number | null)[][] = [
      [],
      [null, JUDUL],
      [null, "NO", "NAMA SISWA", "NIK", "NISN", "NAMA ORTU", "KODE KELURAHAN", "KODE KECAMATAN", "ALAMAT"],
      ...data.map((r, i) => [
        null, i + 1, r.nama, r.nik ?? "", r.nisn, namaOrtu(r), r.kode_kelurahan ?? "", r.kode_kecamatan ?? "",
        alamatByNisn[r.nisn] ?? "",
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!merges"] = [{ s: { r: 1, c: 1 }, e: { r: 1, c: 8 } }];
    // NIK (D), NISN (E), kode (G, H) sebagai teks
    for (let r = 3; r < aoa.length; r++) {
      for (const col of ["D", "E", "G", "H"]) {
        const cell = ws[col + (r + 1)];
        if (cell) {
          cell.t = "s";
          cell.z = "@";
        }
      }
    }
    ws["!cols"] = [{ wch: 2 }, { wch: 5 }, { wch: 35 }, { wch: 20 }, { wch: 14 }, { wch: 28 }, { wch: 16 }, { wch: 16 }, { wch: 50 }];
    return ws;
  }

  function handleExport() {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, buatSheet(), "Sheet1");
    XLSX.writeFile(wb, "Lap-BBP-2026.xlsx");
  }

  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = "@page { size: landscape; margin: 10mm; }";
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const kodeInput =
    "w-28 rounded border border-slate-300 dark:border-slate-600 px-2 py-1 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100 dark:disabled:bg-slate-800 print:border-0 print:p-0";

  return (
    <div className="p-6 md:p-8 print:p-0">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Lap. BBP</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Usulan penerima Bantuan Biaya Pendidikan — diambil dari PIP Seleksi, total <strong>{data.length}</strong> siswa
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExport}
            disabled={data.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Export Excel
          </button>
          <button
            onClick={() => window.print()}
            disabled={data.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white text-sm font-medium px-4 py-2.5 hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            <Printer className="h-4 w-4" />
            Cetak
          </button>
        </div>
      </div>

      {canEdit && data.length > 0 && (
        <div className="flex flex-wrap items-end gap-3 mb-4 print:hidden">
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Kode Kelurahan (semua yang kosong)</label>
            <input
              value={massalKel}
              onChange={(e) => setMassalKel(e.target.value)}
              className="w-44 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Kode Kecamatan (semua yang kosong)</label>
            <input
              value={massalKec}
              onChange={(e) => setMassalKec(e.target.value)}
              className="w-44 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            onClick={isiMassal}
            disabled={menyimpan || (!massalKel.trim() && !massalKec.trim())}
            className="inline-flex items-center gap-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
          >
            {menyimpan && <Loader2 className="h-4 w-4 animate-spin" />}
            Isi Kode Massal
          </button>
          <button
            onClick={isiDariReferensi}
            disabled={menyimpan}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white text-sm font-medium px-4 py-2 hover:bg-indigo-700 disabled:opacity-50"
          >
            Isi dari Referensi Kecamatan
          </button>
        </div>
      )}

      {pesan && (
        <p className="text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-lg px-3 py-2 mb-4 print:hidden">
          {pesan}
        </p>
      )}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg px-3 py-2 mb-4 print:hidden">
          {error}
        </p>
      )}

      <p className="text-center font-semibold text-slate-900 dark:text-slate-100 mb-3 print:text-black print:text-sm">{JUDUL}</p>

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-x-auto print:border-0 print:overflow-visible">
        <table className="w-full text-sm print:text-xs print:text-black">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40 text-left text-slate-500 dark:text-slate-400 print:bg-transparent print:border-black">
              <th className="px-3 py-3 font-medium w-12">NO</th>
              <th className="px-3 py-3 font-medium">NAMA SISWA</th>
              <th className="px-3 py-3 font-medium">NIK</th>
              <th className="px-3 py-3 font-medium">NISN</th>
              <th className="px-3 py-3 font-medium">NAMA ORTU</th>
              <th className="px-3 py-3 font-medium">KODE KELURAHAN</th>
              <th className="px-3 py-3 font-medium">KODE KECAMATAN</th>
              <th className="px-3 py-3 font-medium">ALAMAT</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500">
                  Belum ada siswa terseleksi. Pilih dulu di menu PIP Seleksi.
                </td>
              </tr>
            ) : (
              data.map((r, i) => (
                <tr key={r.id} className="border-b border-slate-100 dark:border-slate-700/60 last:border-0 print:border-slate-400">
                  <td className="px-3 py-2 text-slate-500 dark:text-slate-400 print:text-black">{i + 1}</td>
                  <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-200 print:text-black">{r.nama}</td>
                  <td className="px-3 py-2 text-slate-600 dark:text-slate-300 print:text-black">{r.nik ?? "-"}</td>
                  <td className="px-3 py-2 text-slate-600 dark:text-slate-300 print:text-black">{r.nisn}</td>
                  <td className="px-3 py-2 text-slate-600 dark:text-slate-300 print:text-black">{namaOrtu(r) || "-"}</td>
                  <td className="px-3 py-2">
                    <input
                      key={`kel-${r.id}-${r.kode_kelurahan ?? ""}`}
                      defaultValue={r.kode_kelurahan ?? ""}
                      disabled={!canEdit}
                      onBlur={(e) => {
                        const v = e.target.value.trim() || null;
                        if (v !== (r.kode_kelurahan ?? null)) simpanKode(r, { kode_kelurahan: v });
                      }}
                      className={kodeInput}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      key={`kec-${r.id}-${r.kode_kecamatan ?? ""}`}
                      defaultValue={r.kode_kecamatan ?? ""}
                      disabled={!canEdit}
                      onBlur={(e) => {
                        const v = e.target.value.trim() || null;
                        if (v !== (r.kode_kecamatan ?? null)) simpanKode(r, { kode_kecamatan: v });
                      }}
                      className={kodeInput}
                    />
                  </td>
                  <td className="px-3 py-2 text-slate-600 dark:text-slate-300 print:text-black">
                    {alamatByNisn[r.nisn] || "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
