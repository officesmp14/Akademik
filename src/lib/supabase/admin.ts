import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Client Supabase dengan SERVICE ROLE KEY -- HANYA boleh dipakai di
 * server (Route Handler / Server Component), TIDAK PERNAH di komponen
 * client. Client ini melewati RLS sepenuhnya, jadi setiap Route Handler
 * yang memakainya WAJIB memverifikasi dulu bahwa pemanggilnya benar admin.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY belum diisi di .env.local. Ambil dari Supabase Dashboard -> Project Settings -> API -> service_role key."
    );
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
