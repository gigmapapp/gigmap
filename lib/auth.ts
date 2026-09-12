import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { performers } from "@/lib/repo";
import type { Performer } from "@/lib/types";

export const SESSION_COOKIE = "gigmap_performer";

export async function getSessionPerformerId(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

export async function getSessionPerformer(): Promise<Performer | null> {
  const id = await getSessionPerformerId();
  if (!id) return null;
  return performers.get(id);
}

export async function requirePerformer(nextPath: string): Promise<Performer> {
  const performer = await getSessionPerformer();
  if (!performer) {
    redirect(`/session?next=${encodeURIComponent(nextPath)}`);
  }
  return performer;
}

export async function setSessionPerformerId(id: string | null) {
  const store = await cookies();
  if (!id) {
    store.delete(SESSION_COOKIE);
    return;
  }
  store.set(SESSION_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}
