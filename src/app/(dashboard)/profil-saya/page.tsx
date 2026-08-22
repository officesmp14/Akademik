import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import GtkForm from "@/components/GtkForm";
import { redirect } from "next/navigation";

export default async function ProfilSayaPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (!currentUser.gtkId) {
    return (
      <div className="p-6 md:p-8 max-w-3xl mx-auto">
        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-6">
          <h1 className="text-lg font-semibold text-amber-800 dark:text-amber-400 mb-2">
            Profil Belum Terhubung
          </h1>
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Akun Anda belum terhubung ke data GTK manapun. Silakan hubungi admin
            sekolah untuk menghubungkan akun Anda dengan data guru/tendik yang sesuai.
          </p>
        </div>
      </div>
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("datagtk")
    .select("*")
    .eq("id", currentUser.gtkId)
    .single();

  if (error || !data) {
    return (
      <div className="p-6 md:p-8 max-w-3xl mx-auto">
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-6">
          <h1 className="text-lg font-semibold text-red-800 dark:text-red-400 mb-2">Data Tidak Ditemukan</h1>
          <p className="text-sm text-red-700 dark:text-red-400">
            Data GTK yang terhubung dengan akun Anda tidak ditemukan. Silakan hubungi admin.
          </p>
        </div>
      </div>
    );
  }

  return <GtkForm initialData={data} gtkId={currentUser.gtkId} isOwnProfile />;
}
