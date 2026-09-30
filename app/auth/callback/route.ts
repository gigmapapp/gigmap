import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";
import { establishSessionFromUrl } from "@/lib/auth/exchange";

/** PKCE code exchange when the email link comes back through Supabase's verify redirect. */
export async function GET(request: NextRequest) {
  const result = await establishSessionFromUrl(new URL(request.url));
  if (!result.ok) redirect("/auth/error");
  redirect(result.next);
}
