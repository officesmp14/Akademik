import { createClient } from "@/lib/supabase/server";
import GtkForm from "@/components/GtkForm";
import { notFound } from "next/navigation";

export default async function EditGtkPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("datagtk")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    notFound();
  }

  return <GtkForm initialData={data} gtkId={id} />;
}
