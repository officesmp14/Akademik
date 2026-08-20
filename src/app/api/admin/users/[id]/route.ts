import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { role, gtk_id, password, banned } = body;

  const supabaseAdmin = createAdminClient();

  // Update role / gtk_id
  if (role !== undefined || gtk_id !== undefined) {
    const updatePayload: Record<string, unknown> = {};
    if (role !== undefined) updatePayload.role = role;
    if (gtk_id !== undefined) updatePayload.gtk_id = gtk_id || null;

    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: id, ...updatePayload }, { onConflict: "user_id" });

    if (roleError) {
      return NextResponse.json({ error: roleError.message }, { status: 500 });
    }
  }

  // Update password
  if (password) {
    const { error: pwError } = await supabaseAdmin.auth.admin.updateUserById(id, {
      password,
    });
    if (pwError) {
      return NextResponse.json({ error: pwError.message }, { status: 500 });
    }
  }

  // Nonaktifkan / aktifkan akun
  if (banned !== undefined) {
    const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(id, {
      ban_duration: banned ? "876000h" : "none", // ~100 tahun = nonaktif permanen sampai diaktifkan lagi
    });
    if (banError) {
      return NextResponse.json({ error: banError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  const { id } = await params;

  if (id === currentUser.id) {
    return NextResponse.json(
      { error: "Tidak bisa menghapus akun sendiri" },
      { status: 400 }
    );
  }

  const supabaseAdmin = createAdminClient();
  const { error } = await supabaseAdmin.auth.admin.deleteUser(id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
