"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { compareKelas } from "@/lib/rekap-siswa";
import ExcelJS from "exceljs";
import { Loader2, Printer, Download } from "lucide-react";

type SiswaKesehatan = {
  id: string;
  nama: string | null;
  jk: string | null;
  tanggal_lahir: string | null;
  nik: string | null;
  alamat: string | null;
  rt: string | null;
  kelurahan: string | null;
  hp: string | null;
  rombel: string | null;
};

export default function LaporanKesehatanPage() {
  const [data, setData] = useState<SiswaKesehatan[]>([]);
  const [rombelOptions, setRombelOptions] = useState<string[]>([]);
  const [filterRombel, setFilterRombel] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    let query = supabase
      .from("siswa01")
      .select("id, nama, jk, tanggal_lahir, nik, alamat, rt, kelurahan, hp, rombel")
      .eq("status_siswa", "Aktif")
      .order("rombel", { ascending: true })
      .order("nama", { ascending: true });

    if (filterRombel) query = query.eq("rombel", filterRombel);

    const { data } = await query;
    setData(data ?? []);
    setLoading(false);
  }, [filterRombel]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  function sheetNameAman(nama: string): string {
    return nama.replace(/[:\\/?*[\]]/g, "-").slice(0, 31);
  }

  const KOLOM = [
    { header: "No", key: "no", width: 3, center: true },
    { header: "Nama Siswa", key: "nama", width: 35, center: false },
    { header: "Jenis Kelamin", key: "jk", width: 3, center: true },
    { header: "Tanggal Lahir", key: "tgl_lahir", width: 12, center: true },
    { header: "NIK", key: "nik", width: 17, center: true },
    { header: "Alamat", key: "alamat", width: 50, center: false },
    { header: "No. HP Orang Tua", key: "hp", width: 15, center: true },
  ];

  function buildRow(s: SiswaKesehatan, no: number) {
    return {
      no,
      nama: s.nama || "-",
      jk: s.jk || "-",
      tgl_lahir: s.tanggal_lahir || "-",
      nik: s.nik || "-",
      alamat: [s.alamat, s.rt ? `RT ${s.rt}` : null, s.kelurahan].filter(Boolean).join(", ") || "-",
      hp: s.hp || "-",
    };
  }

  function tambahSheet(workbook: ExcelJS.Workbook, namaSheet: string, siswaList: SiswaKesehatan[]) {
    const sheet = workbook.addWorksheet(sheetNameAman(namaSheet));

    sheet.columns = KOLOM.map((k) => ({ header: k.header, key: k.key, width: k.width }));

    // Baris judul (header)
    const headerRow = sheet.getRow(1);
    headerRow.height = 20;
    headerRow.eachCell((cell) => {
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFFF9C4" }, // kuning muda
      };
      cell.font = { bold: true };
    });

    // Isi data
    siswaList.forEach((s, idx) => {
      const row = sheet.addRow(buildRow(s, idx + 1));
      KOLOM.forEach((k, colIdx) => {
        if (k.center) {
          row.getCell(colIdx + 1).alignment = { horizontal: "center" };
        }
      });
    });

    // Border hitam dari A1 sampai baris terakhir (1 baris judul + jumlah siswa)
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
      // Sudah difilter 1 kelas -> 1 sheet saja
      tambahSheet(workbook, filterRombel, data);
      await downloadWorkbook(workbook, `Data-Pemeriksaan-Kesehatan-${sheetNameAman(filterRombel)}.xlsx`);
      return;
    }

    // "Semua Kelas" -> pisah 1 sheet per rombel
    const grouped = new Map<string, SiswaKesehatan[]>();
    for (const s of data) {
      const kelas = s.rombel || "Tanpa Rombel";
      if (!grouped.has(kelas)) grouped.set(kelas, []);
      grouped.get(kelas)!.push(s);
    }

    const sortedKelas = Array.from(grouped.keys()).sort(compareKelas);
    for (const kelas of sortedKelas) {
      tambahSheet(workbook, kelas, grouped.get(kelas)!);
    }

    await downloadWorkbook(workbook, "Data-Pemeriksaan-Kesehatan-Semua-Kelas.xlsx");
  }

  return (
    <div className="p-6 md:p-8 print:p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Data Pemeriksaan Kesehatan</h1>
          <p className="text-sm text-slate-500 mt-1">
            Status <strong>Aktif</strong> — total <strong>{data.length}</strong> siswa
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            disabled={data.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium px-4 py-2 hover:bg-slate-50 transition-colors disabled:opacity-50"
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

      <div className="flex flex-wrap gap-3 mb-4 print:hidden">
        <select
          value={filterRombel}
          onChange={(e) => setFilterRombel(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Semua Kelas</option>
          {rombelOptions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      <p className="hidden print:block text-lg font-semibold mb-1">
        Data Pemeriksaan Kesehatan {filterRombel ? `- Kelas ${filterRombel}` : "- Semua Kelas"}
      </p>

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 flex justify-center print:hidden">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      ) : data.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-400 print:hidden">
          Tidak ada data siswa.
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto print:border-0 print:overflow-visible">
          <table className="w-full text-sm print:text-xs">
            <thead className="print:table-header-group">
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-500 print:bg-transparent print:border-slate-800">
                <th className="px-3 py-2.5 font-medium w-10">No</th>
                <th className="px-3 py-2.5 font-medium">Nama Siswa</th>
                <th className="px-3 py-2.5 font-medium">JK</th>
                <th className="px-3 py-2.5 font-medium">Tanggal Lahir</th>
                <th className="px-3 py-2.5 font-medium">NIK</th>
                <th className="px-3 py-2.5 font-medium">Alamat</th>
                <th className="px-3 py-2.5 font-medium">No. HP Orang Tua</th>
              </tr>
            </thead>
            <tbody>
              {data.map((s, idx) => (
                <tr key={s.id} className="border-b border-slate-100 last:border-0 print:border-slate-300">
                  <td className="px-3 py-2 text-slate-500">{idx + 1}</td>
                  <td className="px-3 py-2 font-medium text-slate-800">{s.nama || "-"}</td>
                  <td className="px-3 py-2 text-slate-600">{s.jk || "-"}</td>
                  <td className="px-3 py-2 text-slate-600">{s.tanggal_lahir || "-"}</td>
                  <td className="px-3 py-2 text-slate-600">{s.nik || "-"}</td>
                  <td className="px-3 py-2 text-slate-600">
                    {[s.alamat, s.rt ? `RT ${s.rt}` : null, s.kelurahan]
                      .filter(Boolean)
                      .join(", ") || "-"}
                  </td>
                  <td className="px-3 py-2 text-slate-600">{s.hp || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
