import "server-only";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isAuthConfigured, supabaseAnonKey, supabaseUrl } from "@/lib/supabase/public-env";

export async function createAuthServerClient(): Promise<SupabaseClient> {
  const url = supabaseUrl();
  const key = supabaseAnonKey();
  if (!url || !key || !isAuthConfigured()) {
    throw new Error("Supabase Auth is not configured.");
  }
  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot write cookies. proxy.ts refreshes the session.
        }
      },
    },
  });
}
