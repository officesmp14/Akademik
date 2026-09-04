import { createClient } from "@/lib/supabase/server";

export type UserRole = "admin" | "guru" | "kepala_sekolah" | "staf_tu";

export type ModuleAccessEntry = {
  module: string;
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
};

export type CurrentUser = {
  id: string;
  email: string | null;
  role: UserRole | null;
  gtkId: string | null;
  gtkNama: string | null;
  moduleAccess: ModuleAccessEntry[];
  waliKelasRombel: string | null;
  hasMengajarKelas: boolean;
  isKetuaEkskul: boolean;
  isPanitiaPtsPas: boolean;
};

/** Ambil user yang sedang login beserta role, gtk_id, nama, hak akses, & rombel wali kelasnya (server-side). */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [{ data: roleRow }, { data: accessRows }] = await Promise.all([
    supabase
      .from("user_roles")
      .select("role, gtk_id, datagtk(nama)")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("user_module_access")
      .select("module, can_view, can_edit, can_delete")
      .eq("user_id", user.id),
  ]);

  const gtkNama = (roleRow?.datagtk as unknown as { nama?: string } | null)?.nama ?? null;

  let waliKelasRombel: string | null = null;
  let hasMengajarKelas = false;
  let isKetuaEkskul = false;
  let isPanitiaPtsPas = false;
  if (roleRow?.gtk_id) {
    const [{ data: waliRow }, { count: mengajarCount }, { count: ekskulCount }, { count: panitiaCount }] =
      await Promise.all([
        supabase.from("wali_kelas").select("rombel").eq("gtk_id", roleRow.gtk_id).maybeSingle(),
        supabase
          .from("guru_mengajar_kelas")
          .select("id", { count: "exact", head: true })
          .eq("gtk_id", roleRow.gtk_id),
        supabase
          .from("ketua_ekskul")
          .select("id", { count: "exact", head: true })
          .eq("gtk_id", roleRow.gtk_id),
        supabase
          .from("panitia_pts_pas")
          .select("id", { count: "exact", head: true })
          .or(`ketua_gtk_id.eq.${roleRow.gtk_id},sekretaris_gtk_id.eq.${roleRow.gtk_id}`),
      ]);
    waliKelasRombel = waliRow?.rombel ?? null;
    hasMengajarKelas = (mengajarCount ?? 0) > 0;
    isKetuaEkskul = (ekskulCount ?? 0) > 0;
    isPanitiaPtsPas = (panitiaCount ?? 0) > 0;
  }

  return {
    id: user.id,
    email: user.email ?? null,
    role: (roleRow?.role as UserRole) ?? null,
    gtkId: roleRow?.gtk_id ?? null,
    gtkNama,
    moduleAccess: accessRows ?? [],
    waliKelasRombel,
    hasMengajarKelas,
    isKetuaEkskul,
    isPanitiaPtsPas,
  };
}

export function hasModuleView(access: ModuleAccessEntry[], module: string): boolean {
  return access.some((a) => a.module === module && a.can_view);
}

export function hasModuleEdit(access: ModuleAccessEntry[], module: string): boolean {
  return access.some((a) => a.module === module && a.can_edit);
}

export function hasModuleDelete(access: ModuleAccessEntry[], module: string): boolean {
  return access.some((a) => a.module === module && a.can_delete);
}
