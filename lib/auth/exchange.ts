import "server-only";
import type { EmailOtpType } from "@supabase/supabase-js";
import { asOtpType, defaultNextForOtp, safeNextPath } from "@/lib/auth/access";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { isAuthConfigured } from "@/lib/supabase/public-env";

export async function establishSessionFromUrl(url: URL): Promise<{ ok: true; next: string } | { ok: false }> {
  if (!isAuthConfigured()) return { ok: false };
  const type = asOtpType(url.searchParams.get("type"));
  const tokenHash = url.searchParams.get("token_hash");
  const code = url.searchParams.get("code");
  const next = safeNextPath(url.searchParams.get("next"), defaultNextForOtp(type));

  const supabase = await createAuthServerClient();

  if (tokenHash) {
    if (!type) return { ok: false };
    const { error } = await supabase.auth.verifyOtp({
      type: type as EmailOtpType,
      token_hash: tokenHash,
    });
    if (error) return { ok: false };
    return { ok: true, next };
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return { ok: false };
    return { ok: true, next };
  }

  return { ok: false };
}
