import "server-only";
import { headers } from "next/headers";
import { pkceCallbackUrl } from "@/lib/auth/link";

/** Public origin for email links. NEXT_PUBLIC_SITE_URL wins when the request host is not the public site. */
export async function getSiteUrl(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (configured) return configured;
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  if (host) return `${proto}://${host}`;
  return "http://localhost:3000";
}

export async function authCallbackUrl(nextPath: string): Promise<string> {
  return pkceCallbackUrl(await getSiteUrl(), nextPath);
}
