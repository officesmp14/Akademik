import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const { identifier } = await request.json();

    if (!identifier || typeof identifier !== "string") {
      return NextResponse.json({ error: "Identifier wajib diisi" }, { status: 400 });
    }

    // Sudah berupa email -> langsung dipakai, tidak perlu resolusi
    if (identifier.includes("@")) {
      return NextResponse.json({ email: identifier });
    }

    const supabaseAdmin = createAdminClient();

    // Cari data GTK dengan NIP ini
    const { data: gtk, error: gtkError } = await supabaseAdmin
      .from("datagtk")
      .select("id")
      .eq("nip", identifier)
      .maybeSingle();

    if (gtkError) {
      return NextResponse.json(
        { error: `Gagal query datagtk: ${gtkError.message}` },
        { status: 500 }
      );
    }
    if (!gtk) {
      return NextResponse.json(
        { error: `NIP "${identifier}" tidak ditemukan di kolom nip pada data GTK.` },
        { status: 404 }
      );
    }

    // Cari akun login yang terhubung ke data GTK ini
    const { data: roleRow, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("gtk_id", gtk.id)
      .maybeSingle();

    if (roleError) {
      return NextResponse.json(
        { error: `Gagal query user_roles: ${roleError.message}` },
        { status: 500 }
      );
    }
    if (!roleRow) {
      return NextResponse.json(
        {
          error:
            "NIP ditemukan di data GTK, tapi belum ada akun login yang terhubung (kolom gtk_id di user_roles masih kosong). Hubungkan lewat halaman Kelola User.",
        },
        { status: 404 }
      );
    }

    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(
      roleRow.user_id
    );

    if (userError) {
      return NextResponse.json(
        { error: `Gagal ambil data user dari Auth: ${userError.message}` },
        { status: 500 }
      );
    }
    if (!userData.user?.email) {
      return NextResponse.json(
        { error: "Akun ditemukan di Auth, tapi tidak punya email." },
        { status: 500 }
      );
    }

    return NextResponse.json({ email: userData.user.email });
  } catch (err) {
    return NextResponse.json(
      {
        error: `Error tak terduga di server: ${err instanceof Error ? err.message : String(err)}`,
      },
      { status: 500 }
    );
  }
}
