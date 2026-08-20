"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { generateKodeSesi } from "@/lib/kode-sesi";
import { Ujian, UjianSesi, UjianPeserta, UjianJawaban, UjianSoal, UjianPelanggaran, PELANGGARAN_LABEL } from "@/types/ujian";
import { Plus, Loader2, X, Users, Play, Square, ChevronDown, ChevronUp, ShieldAlert } from "lucide-react";

const SESI_STATUS_BADGE: Record<UjianSesi["status"], string> = {
  tertutup: "bg-slate-100 text-slate-600",
  dibuka: "bg-emerald-50 text-emerald-700",
  ditutup: "bg-amber-50 text-amber-700",
};

const PESERTA_STATUS_LABEL: Record<UjianPeserta["status"], string> = {
  belum_mulai: "Belum mulai",
  mengerjakan: "Mengerjakan",
  selesai: "Selesai",
  digugurkan: "Digugurkan",
};

const PESERTA_STATUS_BADGE: Record<UjianPeserta["status"], string> = {
  belum_mulai: "bg-slate-100 text-slate-600",
  mengerjakan: "bg-blue-50 text-blue-700",
  selesai: "bg-emerald-50 text-emerald-700",
  digugurkan: "bg-red-50 text-red-700",
};

type JawabanDetail = UjianJawaban & { ujian_soal: UjianSoal };

export default function SesiClient({
  ujian,
  sesiAwal,
  rombelOptions,
}: {
  ujian: Ujian;
  sesiAwal: UjianSesi[];
  rombelOptions: string[];
}) {
  const [sesiList, setSesiList] = useState<UjianSesi[]>(sesiAwal);
  const [showAddForm, setShowAddForm] = useState(false);
  const [rombelBaru, setRombelBaru] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [expandedSesiId, setExpandedSesiId] = useState<string | null>(null);
  const [pesertaBySesi, setPesertaBySesi] = useState<Record<string, UjianPeserta[]>>({});

  const [detailPeserta, setDetailPeserta] = useState<UjianPeserta | null>(null);
  const [detailJawaban, setDetailJawaban] = useState<JawabanDetail[]>([]);
  const [detailPelanggaran, setDetailPelanggaran] = useState<UjianPelanggaran[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [nilaiEsaiForm, setNilaiEsaiForm] = useState<Record<string, string>>({});

  async function refetchSesi() {
    const supabase = createClient();
    const { data } = await supabase
      .from("ujian_sesi")
      .select("*")
      .eq("ujian_id", ujian.id)
      .order("created_at", { ascending: false });
    setSesiList(data ?? []);
  }

  const fetchPeserta = useCallback(async (sesiId: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("ujian_peserta")
      .select("*")
      .eq("sesi_id", sesiId)
      .order("nama_siswa", { ascending: true });
    setPesertaBySesi((prev) => ({ ...prev, [sesiId]: data ?? [] }));
  }, []);

  useEffect(() => {
    if (!expandedSesiId) return;
    fetchPeserta(expandedSesiId);
    const interval = setInterval(() => fetchPeserta(expandedSesiId), 10000);
    return () => clearInterval(interval);
  }, [expandedSesiId, fetchPeserta]);

  async function handleAddSesi(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setActionError(null);
    const supabase = createClient();

    let lastError: string | null = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const kode = generateKodeSesi();
      const { error } = await supabase.from("ujian_sesi").insert({
        ujian_id: ujian.id,
        kode_sesi: kode,
        rombel: rombelBaru || null,
        status: "tertutup",
      });
      if (!error) {
        lastError = null;
        break;
      }
      lastError = error.message;
      if (!error.message.includes("duplicate") && !error.message.includes("unique")) break;
    }

    setSaving(false);
    if (lastError) {
      setActionError(lastError);
      return;
    }
    setShowAddForm(false);
    setRombelBaru("");
    refetchSesi();
  }

  async function toggleSesiStatus(sesi: UjianSesi) {
    const supabase = createClient();
    if (sesi.status === "dibuka") {
      await supabase
        .from("ujian_sesi")
        .update({ status: "ditutup", ditutup_pada: new Date().toISOString() })
        .eq("id", sesi.id);
    } else if (sesi.status === "tertutup") {
      await supabase
        .from("ujian_sesi")
        .update({ status: "dibuka", dibuka_pada: new Date().toISOString() })
        .eq("id", sesi.id);
    }
    refetchSesi();
  }

  async function openDetail(peserta: UjianPeserta) {
    setDetailPeserta(peserta);
    setDetailLoading(true);
    const supabase = createClient();

    const [{ data: jawaban }, { data: pelanggaran }] = await Promise.all([
      supabase
        .from("ujian_jawaban")
        .select("*, ujian_soal(*)")
        .eq("peserta_id", peserta.id),
      supabase
        .from("ujian_pelanggaran")
        .select("*")
        .eq("peserta_id", peserta.id)
        .order("created_at", { ascending: true }),
    ]);

    const jd = (jawaban ?? []) as unknown as JawabanDetail[];
    setDetailJawaban(jd.sort((a, b) => (a.ujian_soal?.urutan ?? 0) - (b.ujian_soal?.urutan ?? 0)));
    setDetailPelanggaran(pelanggaran ?? []);
    setNilaiEsaiForm(
      Object.fromEntries(jd.filter((j) => j.ujian_soal?.tipe === "esai").map((j) => [j.id, String(j.nilai_esai ?? "")]))
    );
    setDetailLoading(false);
  }

  async function simpanKoreksi() {
    if (!detailPeserta) return;
    setDetailLoading(true);
    const supabase = createClient();

    const updates = Object.entries(nilaiEsaiForm).map(([jawabanId, nilai]) =>
      supabase
        .from("ujian_jawaban")
        .update({ nilai_esai: nilai === "" ? null : Number(nilai) })
        .eq("id", jawabanId)
    );
    await Promise.all(updates);

    const totalEsai = Object.values(nilaiEsaiForm).reduce((sum, v) => sum + (v === "" ? 0 : Number(v)), 0);
    await supabase.from("ujian_peserta").update({ nilai_esai: totalEsai }).eq("id", detailPeserta.id);

    setDetailLoading(false);
    setDetailPeserta(null);
    if (expandedSesiId) fetchPeserta(expandedSesiId);
  }

  async function gugurkanPeserta() {
    if (!detailPeserta) return;
    if (!confirm(`Gugurkan ${detailPeserta.nama_siswa} dari ujian ini?`)) return;
    const supabase = createClient();
    await supabase
      .from("ujian_peserta")
      .update({ status: "digugurkan", waktu_selesai: new Date().toISOString() })
      .eq("id", detailPeserta.id);
    setDetailPeserta(null);
    if (expandedSesiId) fetchPeserta(expandedSesiId);
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <Link href={`/kelola-ujian/${ujian.id}`} className="text-xs text-slate-400 hover:text-indigo-600">
            &larr; Kembali ke {ujian.judul}
          </Link>
          <h1 className="text-2xl font-semibold text-slate-900 mt-1">Sesi Ujian</h1>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white text-sm font-medium px-4 py-2 hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          Buat Sesi
        </button>
      </div>

      <div className="space-y-3">
        {sesiList.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-10 text-center text-slate-400">
            Belum ada sesi. Buat sesi untuk mendapatkan kode ujian.
          </div>
        ) : (
          sesiList.map((sesi) => {
            const expanded = expandedSesiId === sesi.id;
            const peserta = pesertaBySesi[sesi.id] ?? [];
            return (
              <div key={sesi.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="p-4 flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-4">
                    <div className="font-mono text-2xl font-bold tracking-widest text-indigo-700">
                      {sesi.kode_sesi}
                    </div>
                    <div>
                      <p className="text-sm text-slate-700">{sesi.rombel ? `Rombel ${sesi.rombel}` : "Semua rombel"}</p>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${SESI_STATUS_BADGE[sesi.status]}`}>
                        {sesi.status === "tertutup" ? "Belum dibuka" : sesi.status === "dibuka" ? "Sedang dibuka" : "Sudah ditutup"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {sesi.status !== "ditutup" && (
                      <button
                        onClick={() => toggleSesiStatus(sesi)}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ${
                          sesi.status === "dibuka"
                            ? "bg-red-50 text-red-700 hover:bg-red-100"
                            : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        }`}
                      >
                        {sesi.status === "dibuka" ? <Square className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                        {sesi.status === "dibuka" ? "Tutup Sesi" : "Buka Sesi"}
                      </button>
                    )}
                    <button
                      onClick={() => setExpandedSesiId(expanded ? null : sesi.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
                    >
                      <Users className="h-3.5 w-3.5" />
                      Peserta
                      {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                {expanded && (
                  <div className="border-t border-slate-100 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 text-left text-slate-500">
                          <th className="px-4 py-2 font-medium">Nama</th>
                          <th className="px-4 py-2 font-medium">NISN</th>
                          <th className="px-4 py-2 font-medium">Status</th>
                          <th className="px-4 py-2 font-medium">Nilai PG</th>
                          <th className="px-4 py-2 font-medium">Nilai Esai</th>
                          <th className="px-4 py-2 font-medium">Pelanggaran</th>
                          <th className="px-4 py-2 font-medium text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {peserta.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                              Belum ada siswa yang bergabung.
                            </td>
                          </tr>
                        ) : (
                          peserta.map((p) => (
                            <tr key={p.id} className="border-t border-slate-100">
                              <td className="px-4 py-2 font-medium text-slate-800">{p.nama_siswa}</td>
                              <td className="px-4 py-2 text-slate-600">{p.nisn}</td>
                              <td className="px-4 py-2">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PESERTA_STATUS_BADGE[p.status]}`}>
                                  {PESERTA_STATUS_LABEL[p.status]}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-slate-700">{p.nilai_pg ?? "-"}</td>
                              <td className="px-4 py-2 text-slate-700">{p.nilai_esai ?? "-"}</td>
                              <td className="px-4 py-2">
                                {p.jumlah_pelanggaran > 0 ? (
                                  <span className="inline-flex items-center gap-1 text-red-600 text-xs font-medium">
                                    <ShieldAlert className="h-3.5 w-3.5" />
                                    {p.jumlah_pelanggaran}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-xs">0</span>
                                )}
                              </td>
                              <td className="px-4 py-2 text-right">
                                <button
                                  onClick={() => openDetail(p)}
                                  className="text-xs font-medium text-indigo-600 hover:underline"
                                >
                                  Detail
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {showAddForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">Buat Sesi Baru</h3>
              <button onClick={() => setShowAddForm(false)}>
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleAddSesi} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Rombel</label>
                <select
                  value={rombelBaru}
                  onChange={(e) => setRombelBaru(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Semua rombel</option>
                  {rombelOptions.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              {actionError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {actionError}
                </p>
              )}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white text-sm font-medium px-4 py-2 hover:bg-indigo-700 disabled:opacity-60"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Buat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {detailPeserta && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-slate-900">{detailPeserta.nama_siswa}</h3>
                <p className="text-xs text-slate-400">NISN {detailPeserta.nisn}</p>
              </div>
              <button onClick={() => setDetailPeserta(null)}>
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>

            {detailLoading ? (
              <div className="py-10 text-center">
                <Loader2 className="h-5 w-5 animate-spin mx-auto text-slate-400" />
              </div>
            ) : (
              <div className="space-y-5">
                {detailPelanggaran.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 mb-1.5">Log Pelanggaran</p>
                    <ul className="space-y-1 text-xs text-slate-600 bg-red-50/50 border border-red-100 rounded-lg p-3">
                      {detailPelanggaran.map((pl) => (
                        <li key={pl.id}>
                          {new Date(pl.created_at ?? "").toLocaleTimeString("id-ID")} - {PELANGGARAN_LABEL[pl.tipe]}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="space-y-3">
                  <p className="text-xs font-semibold text-slate-500">Jawaban</p>
                  {detailJawaban.map((j, idx) => (
                    <div key={j.id} className="border border-slate-200 rounded-lg p-3">
                      <p className="text-sm text-slate-800 mb-1.5">
                        {idx + 1}. {j.ujian_soal?.pertanyaan}
                      </p>
                      {j.ujian_soal?.tipe === "pilihan_ganda" ? (
                        <p className="text-sm">
                          Jawaban: <span className="font-medium">{j.jawaban_pg ?? "-"}</span>{" "}
                          {j.jawaban_pg && (
                            <span className={j.is_benar ? "text-emerald-600" : "text-red-600"}>
                              ({j.is_benar ? "Benar" : "Salah"})
                            </span>
                          )}
                        </p>
                      ) : (
                        <div>
                          <p className="text-sm text-slate-700 whitespace-pre-wrap mb-2">{j.jawaban_esai || "(kosong)"}</p>
                          <label className="text-xs text-slate-500">Nilai esai</label>
                          <input
                            type="number"
                            value={nilaiEsaiForm[j.id] ?? ""}
                            onChange={(e) => setNilaiEsaiForm((f) => ({ ...f, [j.id]: e.target.value }))}
                            className="w-24 ml-2 rounded-lg border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  {detailPeserta.status === "mengerjakan" ? (
                    <button onClick={gugurkanPeserta} className="text-sm font-medium text-red-600 hover:underline">
                      Gugurkan Peserta
                    </button>
                  ) : (
                    <span />
                  )}
                  <button
                    onClick={simpanKoreksi}
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white text-sm font-medium px-4 py-2 hover:bg-indigo-700"
                  >
                    Simpan Koreksi
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
