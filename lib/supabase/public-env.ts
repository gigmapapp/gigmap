/** Public env. Safe to import from the browser bundle and from proxy.ts. */

export function supabaseUrl(): string | undefined {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  return url || undefined;
}

export function supabaseAnonKey(): string | undefined {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  return key || undefined;
}

/** Cookie sessions need the project URL and the public anon key. */
export function isAuthConfigured(): boolean {
  return Boolean(supabaseUrl() && supabaseAnonKey());
}
