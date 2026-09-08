"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { compareKelas } from "@/lib/rekap-siswa";
import ExcelJS from "exceljs";
import { Loader2, Printer, Download } from "lucide-react";

type SiswaGanakHibot = {
  id: string;
  nisn: string | null;
  nama: string | null;
  jk: string | null;
  agama: string | null;
  rombel: string | null;
  alamat: string | null;
  nama_ayah: string | null;
  nama_ibu: string | null;
};

type WaliKelasInfo = {
  nama: string | null;
  nip: string | null;
  hp: string | null;
};

function labelJk(jk: string | null) {
  if (jk === "L") return "Laki-laki";
  if (jk === "P") return "Perempuan";
  return "-";
}

function sheetNameAman(nama: string): string {
  return nama.replace(/[:\\/?*[\]]/g, "-").slice(0, 31);
}

const KOLOM = [
  { header: "No", key: "no", width: 3, center: true },
  { header: "NISN", key: "nisn", width: 14, center: true },
  { header: "Nama Siswa", key: "nama", width: 30, center: false },
  { header: "Jenis Kelamin", key: "jk", width: 12, center: true },
  { header: "Agama", key: "agama", width: 12, center: false },
  { header: "Kelas", key: "kelas", width: 8, center: true },
  { header: "Alamat", key: "alamat", width: 40, center: false },
  { header: "Nama Ayah", key: "nama_ayah", width: 25, center: false },
  { header: "Nama Ibu", key: "nama_ibu", width: 25, center: false },
];

function buildRow(s: SiswaGanakHibot, no: number) {
  return {
    no,
    nisn: s.nisn || "-",
    nama: s.nama || "-",
    jk: labelJk(s.jk),
    agama: s.agama || "-",
    kelas: s.rombel || "-",
    alamat: s.alamat || "-",
    nama_ayah: s.nama_ayah || "-",
    nama_ibu: s.nama_ibu || "-",
  };
}

export default function LaporanGanakHibotPage() {
  const [data, setData] = useState<SiswaGanakHibot[]>([]);
  const [rombelOptions, setRombelOptions] = useState<string[]>([]);
  const [filterRombel, setFilterRombel] = useState("");
  const [loading, setLoading] = useState(true);
  const [waliKelas, setWaliKelas] = useState<WaliKelasInfo | null>(null);
  const [waliKelasLoading, setWaliKelasLoading] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const supabase = createClient();

      let query = supabase
        .from("siswa01")
        .select("id, nisn, nama, jk, agama, rombel, alamat, nama_ayah, nama_ibu")
        .eq("status_siswa", "Aktif")
        .order("rombel", { ascending: true })
        .order("nama", { ascending: true });

      if (filterRombel) query = query.eq("rombel", filterRombel);

      const { data } = await query;
      setData(data ?? []);
      setLoading(false);
    }
    fetchData();
  }, [filterRombel]);

  useEffect(() => {
    async function fetchWaliKelas() {
      if (!filterRombel) {
        setWaliKelas(null);
        return;
      }
      setWaliKelasLoading(true);
      const supabase = createClient();

      // Query langsung ke wali_kelas + datagtk kena RLS untuk guru biasa
      // (tidak boleh lihat data guru lain), jadi pakai RPC SECURITY
      // DEFINER yang cuma mengembalikan nama/NIP/HP wali kelas satu
      // rombel -- lihat supabase/wali-kelas-info-function.sql.
      const { data } = await supabase.rpc("get_wali_kelas_info", { p_rombel: filterRombel });

      setWaliKelas(data && data.length > 0 ? data[0] : null);
      setWaliKelasLoading(false);
    }
    fetchWaliKelas();
  }, [filterRombel]);

  useEffect(() => {
    async function fetchRombelOptions() {
      const supabase = createClient();
      const { data } = await supabase.from("siswa01").select("rombel").not("rombel", "is", null);
      const unique = Array.from(new Set((data ?? []).map((r) => r.rombel).filter(Boolean) as string[])).sort(
        compareKelas
      );
      setRombelOptions(unique);
    }
    fetchRombelOptions();
  }, []);

  function tambahSheet(workbook: ExcelJS.Workbook, namaSheet: string, siswaList: SiswaGanakHibot[]) {
    const sheet = workbook.addWorksheet(sheetNameAman(namaSheet));

    sheet.columns = KOLOM.map((k) => ({ header: k.header, key: k.key, width: k.width }));

    const headerRow = sheet.getRow(1);
    headerRow.height = 20;
    headerRow.eachCell((cell) => {
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFFF9C4" },
      };
      cell.font = { bold: true };
    });

    siswaList.forEach((s, idx) => {
      const row = sheet.addRow(buildRow(s, idx + 1));
      KOLOM.forEach((k, colIdx) => {
        if (k.center) {
          row.getCell(colIdx + 1).alignment = { horizontal: "center" };
        }
      });
    });

    const baris_terakhir = 1 + siswaList.length;
    const border: Partial<ExcelJS.Borders> = {
      top: { style: "thin", color: { argb: "FF000000" } },
      left: { style: "thin", color: { argb: "FF000000" } },
      bottom: { style: "thin", color: { argb: "FF000000" } },
      right: { style: "thin", color: { argb: "FF000000" } },
    };
    for (let r = 1; r <= baris_terakhir; r++) {
      for (let c = 1; c <= KOLOM.length; c++) {
        sheet.getRow(r).getCell(c).border = border;
      }
    }
  }

  async function downloadWorkbook(workbook: ExcelJS.Workbook, filename: string) {
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleExport() {
    const workbook = new ExcelJS.Workbook();

    if (filterRombel) {
      tambahSheet(workbook, filterRombel, data);
      await downloadWorkbook(workbook, `Ganak-Hibot-${sheetNameAman(filterRombel)}.xlsx`);
      return;
    }

    const grouped = new Map<string, SiswaGanakHibot[]>();
    for (const s of data) {
      const kelas = s.rombel || "Tanpa Rombel";
      if (!grouped.has(kelas)) grouped.set(kelas, []);
      grouped.get(kelas)!.push(s);
    }

    const sortedKelas = Array.from(grouped.keys()).sort(compareKelas);
    for (const kelas of sortedKelas) {
      tambahSheet(workbook, kelas, grouped.get(kelas)!);
    }

    await downloadWorkbook(workbook, "Ganak-Hibot-Semua-Kelas.xlsx");
  }

  return (
    <div className="p-6 md:p-8 print:p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Ganak Hibot</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Status <strong>Aktif</strong> — total <strong>{data.length}</strong> siswa
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            disabled={data.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Export ke Excel
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white text-sm font-medium px-4 py-2 hover:bg-indigo-700 transition-colors"
          >
            <Printer className="h-4 w-4" />
            Cetak
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4 print:hidden">
        <select
          value={filterRombel}
          onChange={(e) => setFilterRombel(e.target.value)}
          className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Semua Kelas</option>
          {rombelOptions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        {filterRombel && (
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs text-slate-600 dark:text-slate-300">
            {waliKelasLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : waliKelas ? (
              <span>
                Wali Kelas: <strong>{waliKelas.nama || "-"}</strong>
                {" · NIP: "}
                {waliKelas.nip || "-"}
                {" · No. HP: "}
                {waliKelas.hp || "-"}
              </span>
            ) : (
              <span className="text-slate-400 dark:text-slate-500">Wali kelas belum ditentukan</span>
            )}
          </div>
        )}
      </div>

      <p className="hidden print:block text-lg font-semibold mb-1">
        Ganak Hibot {filterRombel ? `- Kelas ${filterRombel}` : "- Semua Kelas"}
      </p>

      {loading ? (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-10 flex justify-center print:hidden">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400 dark:text-slate-500" />
        </div>
      ) : data.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-10 text-center text-slate-400 dark:text-slate-500 print:hidden">
          Tidak ada data siswa.
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-x-auto print:border-0 print:overflow-visible">
          <table className="w-full text-sm print:text-xs">
            <thead className="print:table-header-group">
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40 text-left text-slate-500 dark:text-slate-400 print:bg-transparent print:border-slate-800">
                <th className="px-3 py-2.5 font-medium w-10">No</th>
                <th className="px-3 py-2.5 font-medium">NISN</th>
                <th className="px-3 py-2.5 font-medium">Nama Siswa</th>
                <th className="px-3 py-2.5 font-medium">Jenis Kelamin</th>
                <th className="px-3 py-2.5 font-medium">Agama</th>
                <th className="px-3 py-2.5 font-medium">Kelas</th>
                <th className="px-3 py-2.5 font-medium">Alamat</th>
                <th className="px-3 py-2.5 font-medium">Nama Ayah</th>
                <th className="px-3 py-2.5 font-medium">Nama Ibu</th>
              </tr>
            </thead>
            <tbody>
              {data.map((s, idx) => (
                <tr key={s.id} className="border-b border-slate-100 dark:border-slate-700/60 last:border-0 print:border-slate-300">
                  <td className="px-3 py-2 text-slate-500 dark:text-slate-400">{idx + 1}</td>
                  <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{s.nisn || "-"}</td>
                  <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-200">{s.nama || "-"}</td>
                  <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{labelJk(s.jk)}</td>
                  <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{s.agama || "-"}</td>
                  <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{s.rombel || "-"}</td>
                  <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{s.alamat || "-"}</td>
                  <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{s.nama_ayah || "-"}</td>
                  <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{s.nama_ibu || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
