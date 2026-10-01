import "server-only";
import { redirect } from "next/navigation";
import { authUnavailableMessage, safeNextPath } from "@/lib/auth/access";
import { performers } from "@/lib/repo";
import type { Performer } from "@/lib/types";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { isAuthConfigured } from "@/lib/supabase/public-env";

export type SessionUser = {
  id: string;
  email: string | null;
};

/**
 * Verified auth user from the cookie session.
 * getClaims() checks the JWT. The unverified session helper is not used.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  if (!isAuthConfigured()) return null;
  try {
    const supabase = await createAuthServerClient();
    const { data, error } = await supabase.auth.getClaims();
    const sub = data?.claims.sub;
    if (error || !sub) return null;
    const email = typeof data.claims.email === "string" ? data.claims.email : null;
    return { id: sub, email };
  } catch (error) {
    console.error("Could not read the auth session.", error);
    return null;
  }
}

export async function getSessionPerformer(): Promise<Performer | null> {
  const user = await getSessionUser();
  if (!user) return null;
  return performers.getByUserId(user.id);
}

export async function requireUser(nextPath: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    if (!isAuthConfigured()) {
      redirect(`/sign-in?next=${encodeURIComponent(safeNextPath(nextPath))}&error=config`);
    }
    redirect(`/sign-in?next=${encodeURIComponent(safeNextPath(nextPath))}`);
  }
  return user;
}

export async function requirePerformer(nextPath: string): Promise<Performer> {
  const user = await requireUser(nextPath);
  const performer = await performers.getByUserId(user.id);
  if (!performer) {
    redirect(`/account?next=${encodeURIComponent(safeNextPath(nextPath))}`);
  }
  return performer;
}

export function configErrorFromQuery(error: string | undefined): string | null {
  if (error === "config" && !isAuthConfigured()) return authUnavailableMessage();
  return null;
}
