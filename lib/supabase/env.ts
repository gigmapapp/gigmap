import "server-only";
import { isAuthConfigured, supabaseAnonKey, supabaseUrl } from "@/lib/supabase/public-env";

export { isAuthConfigured, supabaseAnonKey, supabaseUrl };

export function supabaseServiceRoleKey(): string | undefined {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return key || undefined;
}

/**
 * Database adapter switches on when the server can reach the project with the
 * service role. Owner writes still go through the signed-in user's client.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl() && supabaseServiceRoleKey());
}

/**
 * `signed` uploads the file from the browser. That path also needs
 * NEXT_PUBLIC_SUPABASE_ANON_KEY; the client reports it when the key is missing.
 */
export function clipUploadMode(): "local" | "signed" {
  return isSupabaseConfigured() ? "signed" : "local";
}
