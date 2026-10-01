import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/public-env";

/**
 * Browser Supabase client for cookie sessions. Call from Client Components only.
 * Do not use this for clip uploads; those use a signed URL and a session-less anon client.
 */
export function createAuthBrowserClient(): SupabaseClient {
  const url = supabaseUrl();
  const key = supabaseAnonKey();
  if (!url || !key) {
    throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }
  return createBrowserClient(url, key);
}
