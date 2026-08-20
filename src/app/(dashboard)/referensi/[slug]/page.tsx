import { notFound } from "next/navigation";
import { getReferensiConfig } from "@/lib/referensi-catalog";
import ReferensiCrud from "@/components/ReferensiCrud";

export default async function ReferensiDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const config = getReferensiConfig(slug);

  if (!config) {
    notFound();
  }

  return <ReferensiCrud config={config} />;
}
