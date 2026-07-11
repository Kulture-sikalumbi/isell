import { createServerClient as createSupabaseServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { runtimeEnvParts } from "@/lib/runtime-env";

/** Cookie-based client for authenticated user sessions */
export async function createAuthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return null;

  const cookieStore = await cookies();

  return createSupabaseServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // setAll can fail in Server Components — safe to ignore
        }
      },
    },
  });
}

/** Service role client for webhooks, admin APIs, and server data fetching */
export function createServiceClient() {
  const url = runtimeEnvParts("NEXT", "PUBLIC", "SUPABASE", "URL");
  const key =
    runtimeEnvParts("SUPABASE", "SERVICE", "ROLE", "KEY") ||
    runtimeEnvParts("NEXT", "PUBLIC", "SUPABASE", "ANON", "KEY");

  if (!url || !key) return null;

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}
