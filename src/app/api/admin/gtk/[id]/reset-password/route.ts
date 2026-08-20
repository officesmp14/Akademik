import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { createAdminClient } from "@/lib/supabase/admin";

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let result = "";
  for (let i = 0; i < 10; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  const { id } = await params;
  const supabaseAdmin = createAdminClient();

  const { data: roleRow, error: roleError } = await supabaseAdmin
    .from("user_roles")
    .select("user_id")
    .eq("gtk_id", id)
    .maybeSingle();

  if (roleError) {
    return NextResponse.json({ error: roleError.message }, { status: 500 });
  }
  if (!roleRow) {
    return NextResponse.json(
      { error: "GTK ini belum terhubung ke akun user manapun." },
      { status: 404 }
    );
  }

  const password = generatePassword();
  const { data: updated, error: updateError } =
    await supabaseAdmin.auth.admin.updateUserById(roleRow.user_id, { password });

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, password, email: updated.user.email });
}
