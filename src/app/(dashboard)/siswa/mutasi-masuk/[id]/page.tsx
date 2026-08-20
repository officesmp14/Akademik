import { createClient } from "@/lib/supabase/server";
import MutasiMasukForm from "@/components/MutasiMasukForm";
import { notFound } from "next/navigation";

export default async function EditMutasiMasukPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("siswa_mutasi_masuk")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    notFound();
  }

  return <MutasiMasukForm initialData={data} recordId={id} />;
}
