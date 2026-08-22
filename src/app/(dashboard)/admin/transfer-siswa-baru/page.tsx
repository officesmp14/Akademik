"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { compareKelas } from "@/lib/rekap-siswa";
import { ArrowRightLeft, Loader2, AlertTriangle, CheckCircle2, XCircle, UserPlus2 } from "lucide-react";

// Hanya 7 kolom ini yang ditransfer dari siswa_baru ke siswa01. NISN
// tidak "ditransfer" sebagai data baru, tapi dipakai sebagai kunci
// pencocokan (upsert) untuk menentukan baris siswa01 mana yang diupdate.
type SiswaBaruRow = {
  id: string;
  nama: string | null;
  nisn: string | null;
  rombel: string | null;
  nipd: string | null;
  jarak_tempuh: string | null;
  berat_badan: string | null;
  tinggi_badan: string | null;
  lingkar_kepala: string | null;
  jml_saudara: string | null;
  jarak_rumah: string | null;
};

const FETCH_FIELDS =
  "id, nama, nisn, rombel, nipd, jarak_tempuh, berat_badan, tinggi_badan, lingkar_kepala, jml_saudara, jarak_rumah";

/** Buang kata "menit" (apapun kapitalisasinya), sisakan angkanya saja. */
function bersihkanJarakTempuh(value: string | null): string | null {
  if (!value) return null;
  const cleaned = value.replace(/menit/gi, "").trim();
  return cleaned || null;
}

/** jarak_rumah (km) > 1,1 -> kode 2 ("Lebih 1 km"), selain itu -> kode 1 ("Kurang 1 km"). */
function jarakRumahKeKode(value: string | null): string | null {
  if (!value) return null;
  const angka = parseFloat(value.replace(",", "."));
  if (isNaN(angka)) return null;
  return angka > 1.1 ? "2" : "1";
}

type TransferResult = {
  successCount: number;
  failedRows: { nama: string; reason: string }[];
};

export default function TransferSiswaBaruPage() {
  const [rows, setRows] = useState<SiswaBaruRow[]>([]);
  const [existingNisn, setExistingNisn] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transferring, setTransferring] = useState(false);
  const [result, setResult] = useState<TransferResult | null>(null);
  const [filterRombel, setFilterRombel] = useState("");
  const [filterStatus, setFilterStatus] = useState<"" | "ada" | "belum">("");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    const supabase = createClient();

    const [siswaBaruRes, siswa01Res] = await Promise.all([
      supabase.from("siswa_baru").select(FETCH_FIELDS).order("nama", { ascending: true }),
      supabase.from("siswa01").select("nisn").not("nisn", "is", null),
    ]);

    if (siswaBaruRes.error) {
      setError(siswaBaruRes.error.message);
      setLoading(false);
      return;
    }

    setRows((siswaBaruRes.data ?? []) as unknown as SiswaBaruRow[]);
    setExistingNisn(
      new Set((siswa01Res.data ?? []).map((r) => (r.nisn ?? "").trim()).filter(Boolean))
    );
    setSelected(new Set());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const rombelOptions = useMemo(
    () =>
      Array.from(new Set(rows.map((r) => r.rombel).filter(Boolean) as string[])).sort(compareKelas),
    [rows]
  );

  const filteredRows = useMemo(() => {
    let result = rows;
    if (filterRombel) result = result.filter((r) => r.rombel === filterRombel);
    if (filterStatus) {
      result = result.filter((r) => {
        const nisn = (r.nisn ?? "").trim();
        const ada = Boolean(nisn) && existingNisn.has(nisn);
        return filterStatus === "ada" ? ada : !ada;
      });
    }
    return result;
  }, [rows, filterRombel, filterStatus, existingNisn]);

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    const visibleIds = filteredRows.map((r) => r.id);
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));

    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        visibleIds.forEach((id) => next.delete(id));
      } else {
        visibleIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }

  async function handleTransfer() {
    const targets = rows.filter((r) => selected.has(r.id));
    if (targets.length === 0) return;

    setTransferring(true);
    setResult(null);
    const supabase = createClient();

    const failedRows: TransferResult["failedRows"] = [];
    let successCount = 0;

    for (const row of targets) {
      const nisn = (row.nisn ?? "").trim();

      if (!nisn) {
        failedRows.push({ nama: row.nama || "(tanpa nama)", reason: "NISN kosong, tidak bisa dicocokkan ke Data Siswa." });
        continue;
      }

      if (!existingNisn.has(nisn)) {
        failedRows.push({
          nama: row.nama || "(tanpa nama)",
          reason: "NISN belum terdaftar di Data Siswa -- dilewati supaya tidak membuat data siswa baru tanpa nama/biodata lengkap.",
        });
        continue;
      }

      const payload = {
        nisn,
        nipd: row.nipd || null,
        jarak_tempuh: bersihkanJarakTempuh(row.jarak_tempuh),
        berat_badan: row.berat_badan || null,
        tinggi_badan: row.tinggi_badan || null,
        lingkar_kepala: row.lingkar_kepala || null,
        jml_saudara: row.jml_saudara || null,
        jarak_rumah_km: jarakRumahKeKode(row.jarak_rumah),
      };

      const { error } = await supabase.from("siswa01").upsert(payload, { onConflict: "nisn" });

      if (error) {
        failedRows.push({ nama: row.nama || "(tanpa nama)", reason: error.message });
      } else {
        successCount += 1;
      }
    }

    setTransferring(false);
    setResult({ successCount, failedRows });
    fetchAll();
  }

  const selectedCount = selected.size;

  return (
    <div className="p-6 md:p-8 dark:bg-slate-900 min-h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Transfer Data Siswa Baru</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Salin 7 kolom dari <code className="bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded text-xs">siswa_baru</code> ke
          Data Siswa (dicocokkan lewat NISN): NIPD, Jarak Tempuh, Berat Badan, Tinggi Badan, Lingkar
          Kepala, Saudara Kandung, dan Jarak Rumah (km). Data asal di{" "}
          <code className="bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded text-xs">siswa_baru</code> tidak dihapus.
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg px-3 py-2 mb-4">
          {error}
        </p>
      )}

      {result && (
        <div className="space-y-3 mb-5">
          <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl p-4 flex items-start gap-2.5">
            <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-sm text-emerald-800 dark:text-emerald-400">
              {result.successCount} data berhasil ditransfer ke Data Siswa.
            </p>
          </div>
          {result.failedRows.length > 0 && (
            <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-4">
              <div className="flex items-start gap-2.5">
                <XCircle className="h-4.5 w-4.5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-400">
                    {result.failedRows.length} data gagal ditransfer
                  </p>
                  <ul className="text-xs text-red-700 dark:text-red-400 mt-2 space-y-1">
                    {result.failedRows.map((f, i) => (
                      <li key={i}>
                        {f.nama}: {f.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <select
            value={filterRombel}
            onChange={(e) => setFilterRombel(e.target.value)}
            className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">Semua Kelas</option>
            {rombelOptions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as "" | "ada" | "belum")}
            className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">Semua Status</option>
            <option value="ada">Sudah ada di Data Siswa</option>
            <option value="belum">Belum ada di Data Siswa</option>
          </select>

          <p className="text-sm text-slate-500 dark:text-slate-400">
            {filteredRows.length} dari {rows.length} data &middot; {selectedCount} dipilih
          </p>
        </div>
        <button
          onClick={handleTransfer}
          disabled={selectedCount === 0 || transferring}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white text-sm font-medium px-4 py-2 hover:bg-indigo-700 disabled:opacity-50 transition-colors shrink-0"
        >
          {transferring ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowRightLeft className="h-4 w-4" />
          )}
          Transfer {selectedCount > 0 ? `${selectedCount} Data` : "Data Terpilih"}
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40 text-left text-slate-500 dark:text-slate-400">
              <th className="px-4 py-3 font-medium w-10">
                <input
                  type="checkbox"
                  checked={
                    filteredRows.length > 0 && filteredRows.every((r) => selected.has(r.id))
                  }
                  onChange={toggleAll}
                  className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500"
                />
              </th>
              <th className="px-4 py-3 font-medium w-12">No</th>
              <th className="px-4 py-3 font-medium">Nama</th>
              <th className="px-4 py-3 font-medium">NISN</th>
              <th className="px-4 py-3 font-medium">NIPD</th>
              <th className="px-4 py-3 font-medium">Rombel</th>
              <th className="px-4 py-3 font-medium">Tinggi</th>
              <th className="px-4 py-3 font-medium">Berat</th>
              <th className="px-4 py-3 font-medium">Lingkar Kepala</th>
              <th className="px-4 py-3 font-medium">Saudara</th>
              <th className="px-4 py-3 font-medium">Jarak Tempuh</th>
              <th className="px-4 py-3 font-medium">Jarak Rumah</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={13} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                </td>
              </tr>
            ) : filteredRows.length === 0 ? (
              <tr>
                <td colSpan={13} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500">
                  <UserPlus2 className="h-6 w-6 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                  {rows.length === 0
                    ? "Tidak ada data di siswa_baru."
                    : "Tidak ada data untuk kelas ini."}
                </td>
              </tr>
            ) : (
              filteredRows.map((row, idx) => {
                const nisn = (row.nisn ?? "").trim();
                const alreadyExists = Boolean(nisn) && existingNisn.has(nisn);
                const jarakTempuhBersih = bersihkanJarakTempuh(row.jarak_tempuh);
                const jarakRumahKode = jarakRumahKeKode(row.jarak_rumah);
                return (
                  <tr key={row.id} className="border-b border-slate-100 dark:border-slate-700/60 last:border-0 hover:bg-slate-50/60 dark:hover:bg-slate-700/60">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(row.id)}
                        onChange={() => toggleRow(row.id)}
                        className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{idx + 1}</td>
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{row.nama || "-"}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{row.nisn || "-"}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{row.nipd || "-"}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{row.rombel || "-"}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{row.tinggi_badan || "-"}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{row.berat_badan || "-"}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{row.lingkar_kepala || "-"}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{row.jml_saudara || "-"}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {jarakTempuhBersih ?? "-"}
                      {row.jarak_tempuh && row.jarak_tempuh !== jarakTempuhBersih && (
                        <span className="text-slate-400 dark:text-slate-500"> (asal: {row.jarak_tempuh})</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {jarakRumahKode ?? "-"}
                      {row.jarak_rumah && <span className="text-slate-400 dark:text-slate-500"> ({row.jarak_rumah} km)</span>}
                    </td>
                    <td className="px-4 py-3">
                      {!nisn ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 px-2.5 py-0.5 text-xs font-medium">
                          <AlertTriangle className="h-3 w-3" />
                          NISN kosong
                        </span>
                      ) : alreadyExists ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 px-2.5 py-0.5 text-xs font-medium">
                          <AlertTriangle className="h-3 w-3" />
                          Sudah ada (akan diperbarui)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 px-2.5 py-0.5 text-xs font-medium">
                          <AlertTriangle className="h-3 w-3" />
                          Belum ada di Data Siswa (akan dilewati)
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
