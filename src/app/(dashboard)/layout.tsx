import { redirect } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import { RoleProvider } from "@/lib/role-context";
import { getCurrentUser } from "@/lib/current-user";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  return (
    <RoleProvider
      value={{
        role: currentUser.role,
        gtkId: currentUser.gtkId,
        gtkNama: currentUser.gtkNama,
        email: currentUser.email ?? "",
        moduleAccess: currentUser.moduleAccess,
        waliKelasRombel: currentUser.waliKelasRombel,
        hasMengajarKelas: currentUser.hasMengajarKelas,
        isKetuaEkskul: currentUser.isKetuaEkskul,
        isPanitiaPtsPas: currentUser.isPanitiaPtsPas,
      }}
    >
      <DashboardShell>{children}</DashboardShell>
    </RoleProvider>
  );
}
