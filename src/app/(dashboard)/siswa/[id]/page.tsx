import { createClient } from "@/lib/supabase/server";
import SiswaForm from "@/components/SiswaForm";
import { notFound } from "next/navigation";

export default async function EditSiswaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("siswa01")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    notFound();
  }

  return <SiswaForm initialData={data} siswaId={id} />;
}
