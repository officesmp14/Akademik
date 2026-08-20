import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  const supabaseAdmin = createAdminClient();

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers({
    perPage: 1000,
  });
  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 });
  }

  const { data: roles, error: rolesError } = await supabaseAdmin
    .from("user_roles")
    .select("user_id, role, gtk_id, datagtk(nama, nip)");
  if (rolesError) {
    return NextResponse.json({ error: rolesError.message }, { status: 500 });
  }

  const roleMap = new Map(roles?.map((r) => [r.user_id, r]));

  const users = authData.users.map((u) => {
    const roleRow = roleMap.get(u.id);
    const gtkInfo = roleRow?.datagtk as unknown as { nama?: string; nip?: string } | null;
    return {
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      banned_until: (u as unknown as { banned_until?: string }).banned_until ?? null,
      role: roleRow?.role ?? null,
      gtk_id: roleRow?.gtk_id ?? null,
      gtk_nama: gtkInfo?.nama ?? null,
      gtk_nip: gtkInfo?.nip ?? null,
    };
  });

  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  const body = await request.json();
  const { email, password, role, gtk_id } = body;

  if (!email || !password || !role) {
    return NextResponse.json({ error: "Email, password, dan role wajib diisi" }, { status: 400 });
  }

  const supabaseAdmin = createAdminClient();

  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError || !created.user) {
    return NextResponse.json(
      { error: createError?.message ?? "Gagal membuat user" },
      { status: 500 }
    );
  }

  const { error: roleError } = await supabaseAdmin.from("user_roles").insert({
    user_id: created.user.id,
    role,
    gtk_id: gtk_id || null,
  });

  if (roleError) {
    // Rollback: hapus user auth yang sudah terlanjur dibuat kalau gagal set role
    await supabaseAdmin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: roleError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, user: created.user });
}
