import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { createAdminClient } from "@/lib/supabase/admin";

// Dipakai oleh halaman Home yang bisa diakses SEMUA role (bukan cuma admin).
// Sengaja pakai service role supaya angkanya sama persis untuk semua GTK,
// tidak tergantung RLS row-level per role (mis. guru yang RLS-nya cuma
// mengizinkan lihat data GTK miliknya sendiri). Hanya mengembalikan data
// ringkas untuk rekap jumlah (bukan data pribadi lengkap), jadi aman
// ditampilkan ke semua user yang sudah login.
export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Belum login" }, { status: 401 });
  }

  const supabaseAdmin = createAdminClient();

  const [siswaRes, gtkRes] = await Promise.all([
    supabaseAdmin.from("siswa01").select("rombel, jk, agama").eq("status_siswa", "Aktif"),
    supabaseAdmin
      .from("datagtk")
      .select("jk, jenis_ptk, status_aktif, jenjang_pendidikan, tanggal_lahir"),
  ]);

  if (siswaRes.error) {
    return NextResponse.json({ error: siswaRes.error.message }, { status: 500 });
  }
  if (gtkRes.error) {
    return NextResponse.json({ error: gtkRes.error.message }, { status: 500 });
  }

  return NextResponse.json({ siswa: siswaRes.data ?? [], gtk: gtkRes.data ?? [] });
}
