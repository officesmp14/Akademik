import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import SesiClient from "@/components/ujian/SesiClient";

export default async function UjianSesiPage({
  params,
}: {
  params: Promise<{ ujianId: string }>;
}) {
  const { ujianId } = await params;
  const supabase = await createClient();

  const [{ data: ujian, error }, { data: sesiList }, { data: siswaRombel }] = await Promise.all([
    supabase.from("ujian").select("*").eq("id", ujianId).maybeSingle(),
    supabase.from("ujian_sesi").select("*").eq("ujian_id", ujianId).order("created_at", { ascending: false }),
    supabase.from("siswa01").select("rombel").eq("status_siswa", "Aktif"),
  ]);

  if (error || !ujian) {
    notFound();
  }

  const rombelOptions = Array.from(
    new Set((siswaRombel ?? []).map((r) => r.rombel).filter((r): r is string => Boolean(r)))
  ).sort();

  return <SesiClient ujian={ujian} sesiAwal={sesiList ?? []} rombelOptions={rombelOptions} />;
}
