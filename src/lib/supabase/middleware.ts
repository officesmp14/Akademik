import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const ADMIN_ONLY = ["/admin"];

// Peta prefix path -> daftar modul yang bisa membuka akses (any match cukup)
const PATH_MODULE_MAP: { prefix: string; modules: string[] }[] = [
  { prefix: "/siswa/mutasi-masuk", modules: ["mutasi_masuk_siswa"] },
  { prefix: "/siswa", modules: ["siswa"] },
  { prefix: "/gtk", modules: ["gtk"] },
  { prefix: "/registrasi-peserta-didik", modules: ["registrasi_peserta_didik"] },
  { prefix: "/data-periodik", modules: ["data_periodik"] },
  { prefix: "/laporan/rekap-siswa", modules: ["laporan_rekap_siswa"] },
  { prefix: "/laporan/cek-kursi", modules: ["laporan_cek_kursi"] },
  { prefix: "/laporan/cek-nis", modules: ["laporan_cek_nis"] },
  { prefix: "/laporan/data-siswa-mbg", modules: ["laporan_data_siswa_mbg"] },
  { prefix: "/laporan/dinas-gtk", modules: ["laporan_dinas_gtk"] },
  { prefix: "/laporan/kesehatan", modules: ["laporan_kesehatan"] },
  { prefix: "/laporan/kelas-ix", modules: ["laporan_kelas_ix"] },
  { prefix: "/laporan/verifikasi-presensi", modules: ["laporan_verifikasi_presensi"] },
  { prefix: "/laporan/riwayat-mutasi", modules: ["laporan_riwayat_mutasi"] },
  {
    prefix: "/laporan",
    modules: [
      "laporan_rekap_siswa",
      "laporan_statistik_sekolah",
      "laporan_bandingkan_data",
      "laporan_riwayat_mutasi",
      "laporan_cek_kursi",
      "laporan_cek_nis",
      "laporan_data_siswa_mbg",
      "laporan_dinas_gtk",
      "laporan_kesehatan",
      "laporan_kelas_ix",
      "laporan_verifikasi_presensi",
    ],
  },
];

function homeForRole(): string {
  return "/home";
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isLoginPage = path.startsWith("/login");
  const isApiRoute = path.startsWith("/api/");

  if (isApiRoute) {
    return supabaseResponse;
  }

  if (!user && !isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (!user) {
    return supabaseResponse;
  }

  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role, gtk_id")
    .eq("user_id", user.id)
    .maybeSingle();
  const role = roleRow?.role ?? null;
  const gtkId = roleRow?.gtk_id ?? null;

  if (isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = homeForRole();
    return NextResponse.redirect(url);
  }

  // Halaman /admin/* HANYA untuk admin
  if (role !== "admin" && ADMIN_ONLY.some((p) => path.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = homeForRole();
    return NextResponse.redirect(url);
  }

  // Admin & Kepala Sekolah: akses penuh ke halaman non-admin seperti biasa
  if (role === "admin" || role === "kepala_sekolah") {
    return supabaseResponse;
  }

  // /kelas-saya dan /rapor-sts HANYA untuk yang benar-benar ditugaskan jadi wali kelas
  if (path.startsWith("/kelas-saya") || path.startsWith("/rapor-sts")) {
    const { data: waliRow } = gtkId
      ? await supabase.from("wali_kelas").select("id").eq("gtk_id", gtkId).maybeSingle()
      : { data: null };

    if (!waliRow) {
      const url = request.nextUrl.clone();
      url.pathname = "/profil-saya";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // Wali kelas boleh buka /registrasi-peserta-didik dan /data-periodik
  // langsung (dua path ini dulu sama sekali tidak dibatasi middleware,
  // jadi bypass ini menjaga wali kelas tetap bisa kelola kelasnya sendiri
  // sekarang keduanya digating modul registrasi_peserta_didik/data_periodik).
  if (path.startsWith("/registrasi-peserta-didik") || path.startsWith("/data-periodik")) {
    const { data: waliRow } = gtkId
      ? await supabase.from("wali_kelas").select("id").eq("gtk_id", gtkId).maybeSingle()
      : { data: null };

    if (waliRow) {
      return supabaseResponse;
    }
    // Bukan wali kelas -> lanjut ke pengecekan hak akses modul umum di bawah
  }

  // /ekstrakurikuler-siswa HANYA untuk wali kelas (lihat siswanya sendiri)
  // ATAU guru yang jadi ketua/pembina ekskul (kelola ekskul miliknya).
  // Guru biasa yang bukan keduanya tidak perlu lihat menu ini sama sekali.
  if (path.startsWith("/ekstrakurikuler-siswa")) {
    const [{ data: waliRow }, { count: ekskulCount }] = await Promise.all([
      gtkId
        ? supabase.from("wali_kelas").select("id").eq("gtk_id", gtkId).maybeSingle()
        : Promise.resolve({ data: null }),
      gtkId
        ? supabase.from("ketua_ekskul").select("id", { count: "exact", head: true }).eq("gtk_id", gtkId)
        : Promise.resolve({ count: 0 }),
    ]);

    if (!waliRow && !(ekskulCount ?? 0)) {
      const url = request.nextUrl.clone();
      url.pathname = "/profil-saya";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // Wali kelas IX boleh buka /laporan/kelas-ix langsung (tanpa perlu hak akses
  // modul laporan_kelas_ix dari admin), sama seperti /kelas-saya di atas.
  if (path.startsWith("/laporan/kelas-ix")) {
    const { data: waliRow } = gtkId
      ? await supabase.from("wali_kelas").select("rombel").eq("gtk_id", gtkId).maybeSingle()
      : { data: null };

    if (waliRow?.rombel?.startsWith("IX.")) {
      return supabaseResponse;
    }
    // Bukan wali kelas IX -> lanjut ke pengecekan hak akses modul umum di bawah
  }

  // Wali kelas (kelas berapapun) boleh buka /laporan/verifikasi-presensi
  // langsung untuk kelasnya sendiri, tanpa perlu hak akses modul
  // laporan_verifikasi_presensi dari admin.
  if (path.startsWith("/laporan/verifikasi-presensi")) {
    const { data: waliRow } = gtkId
      ? await supabase.from("wali_kelas").select("id").eq("gtk_id", gtkId).maybeSingle()
      : { data: null };

    if (waliRow) {
      return supabaseResponse;
    }
    // Bukan wali kelas -> lanjut ke pengecekan hak akses modul umum di bawah
  }

  // Wali kelas (kelas berapapun) boleh buka /laporan/riwayat-mutasi langsung
  // untuk kelasnya sendiri, tanpa perlu hak akses modul
  // laporan_riwayat_mutasi dari admin.
  if (path.startsWith("/laporan/riwayat-mutasi")) {
    const { data: waliRow } = gtkId
      ? await supabase.from("wali_kelas").select("id").eq("gtk_id", gtkId).maybeSingle()
      : { data: null };

    if (waliRow) {
      return supabaseResponse;
    }
    // Bukan wali kelas -> lanjut ke pengecekan hak akses modul umum di bawah
  }

  // Wali kelas boleh buka halaman EDIT siswa spesifik (/siswa/{uuid}) untuk
  // siswa di kelasnya, terlepas dari hak akses modul 'siswa'. RLS di
  // database tetap jadi penjaga akhir kalau siswa itu bukan di kelasnya.
  const isSiswaDetailPath = /^\/siswa\/[0-9a-fA-F-]{36}$/.test(path);
  if (isSiswaDetailPath && gtkId) {
    const { data: waliRow } = await supabase
      .from("wali_kelas")
      .select("id")
      .eq("gtk_id", gtkId)
      .maybeSingle();
    if (waliRow) {
      return supabaseResponse;
    }
  }

  // /presensi/rekap-harian HANYA untuk wali kelas (pantau kelasnya sendiri
  // per jam pelajaran hari itu), tidak untuk guru pengajar biasa. Dicek
  // sebelum aturan /presensi umum di bawah supaya tidak ikut disyaratkan
  // punya penugasan mengajar.
  if (path === "/presensi/rekap-harian" || path.startsWith("/presensi/rekap-harian/")) {
    const { data: waliRow } = gtkId
      ? await supabase.from("wali_kelas").select("id").eq("gtk_id", gtkId).maybeSingle()
      : { data: null };

    if (!waliRow) {
      const url = request.nextUrl.clone();
      url.pathname = "/profil-saya";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // /presensi/rekap boleh diakses guru pengajar ATAU wali kelas (untuk
  // pantau kelasnya), ATAU siapa pun yang diberi modul presensi_rekap
  // lewat Hak Akses -- dicek lebih dulu sebelum aturan /presensi umum di
  // bawah (yang HANYA untuk guru pengajar). Pengecekan per-segment (bukan
  // cuma startsWith) supaya tidak salah menangkap path lain seperti
  // /presensi/rekap-mapel yang aturannya beda (HANYA guru pengajar).
  if (path === "/presensi/rekap" || path.startsWith("/presensi/rekap/")) {
    const [{ count: mengajarCount }, { data: waliRow }, { data: accessRows }] = await Promise.all([
      gtkId
        ? supabase
            .from("guru_mengajar_kelas")
            .select("id", { count: "exact", head: true })
            .eq("gtk_id", gtkId)
        : Promise.resolve({ count: 0 }),
      gtkId
        ? supabase.from("wali_kelas").select("id").eq("gtk_id", gtkId).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from("user_module_access")
        .select("module")
        .eq("user_id", user.id)
        .eq("can_view", true)
        .eq("module", "presensi_rekap"),
    ]);

    if (!mengajarCount && !waliRow && !(accessRows?.length ?? 0)) {
      const url = request.nextUrl.clone();
      url.pathname = "/profil-saya";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // /presensi HANYA untuk guru yang punya penugasan mengajar kelas
  if (path.startsWith("/presensi")) {
    const { count } = gtkId
      ? await supabase
          .from("guru_mengajar_kelas")
          .select("id", { count: "exact", head: true })
          .eq("gtk_id", gtkId)
      : { count: 0 };

    if (!count) {
      const url = request.nextUrl.clone();
      url.pathname = "/profil-saya";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // /nilai HANYA untuk guru yang punya penugasan mengajar kelas
  if (path.startsWith("/nilai")) {
    const { count } = gtkId
      ? await supabase
          .from("guru_mengajar_kelas")
          .select("id", { count: "exact", head: true })
          .eq("gtk_id", gtkId)
      : { count: 0 };

    if (!count) {
      const url = request.nextUrl.clone();
      url.pathname = "/profil-saya";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // /kelola-ujian HANYA untuk guru yang punya penugasan mengajar kelas
  // (admin/kepala_sekolah sudah lolos di blok isFullAccessRole di atas)
  if (path.startsWith("/kelola-ujian")) {
    const { count } = gtkId
      ? await supabase
          .from("guru_mengajar_kelas")
          .select("id", { count: "exact", head: true })
          .eq("gtk_id", gtkId)
      : { count: 0 };

    if (!count) {
      const url = request.nextUrl.clone();
      url.pathname = "/profil-saya";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // Guru/Staf TU (atau role belum diatur): cek dulu apakah path ini butuh
  // pembatasan, dan kalau ya, apakah mereka punya module access tambahan
  const matched = PATH_MODULE_MAP.find((m) => path.startsWith(m.prefix));
  if (matched) {
    const { data: accessRows } = await supabase
      .from("user_module_access")
      .select("module")
      .eq("user_id", user.id)
      .eq("can_view", true)
      .in("module", matched.modules);

    const allowed = (accessRows?.length ?? 0) > 0;

    if (!allowed) {
      const url = request.nextUrl.clone();
      url.pathname = "/profil-saya";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
