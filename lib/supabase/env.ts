import "server-only";

export function supabaseUrl(): string | undefined {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  return url || undefined;
}

export function supabaseAnonKey(): string | undefined {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  return key || undefined;
}

export function supabaseServiceRoleKey(): string | undefined {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return key || undefined;
}

/** Database adapter switches on when the server can reach the project. */
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
