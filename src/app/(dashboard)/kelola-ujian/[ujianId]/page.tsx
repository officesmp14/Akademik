import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import UjianDetailClient from "@/components/ujian/UjianDetailClient";

export default async function UjianDetailPage({
  params,
}: {
  params: Promise<{ ujianId: string }>;
}) {
  const { ujianId } = await params;
  const supabase = await createClient();

  const [{ data: ujian, error }, { data: soal }] = await Promise.all([
    supabase.from("ujian").select("*").eq("id", ujianId).maybeSingle(),
    supabase
      .from("ujian_soal")
      .select("*")
      .eq("ujian_id", ujianId)
      .order("urutan", { ascending: true }),
  ]);

  if (error || !ujian) {
    notFound();
  }

  return <UjianDetailClient ujian={ujian} soalAwal={soal ?? []} />;
}
