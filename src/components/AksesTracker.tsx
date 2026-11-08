"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { namaMenuDariPath } from "@/lib/menu-akses";

// Mencatat halaman yang dibuka user (Akses Pengguna). Gagal mencatat tidak boleh
// mengganggu pemakaian aplikasi, jadi semua error diabaikan diam-diam.
export default function AksesTracker() {
  const pathname = usePathname();
  const terakhir = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || terakhir.current === pathname) return;
    terakhir.current = pathname;
    (async () => {
      try {
        const supabase = createClient();
        await supabase.from("akses_log").insert({
          jenis: "halaman",
          path: pathname,
          menu: namaMenuDariPath(pathname),
        });
      } catch {
        // abaikan
      }
    })();
  }, [pathname]);

  return null;
}
