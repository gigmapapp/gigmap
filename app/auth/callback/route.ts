import { redirect } from "next/navigation";
import { NextResponse, type NextRequest } from "next/server";
import { authErrorPath, authLinkFailureFromParams, callbackHashHandoffDocument, callbackSuccessPath, exchangeFailure } from "@/lib/auth/link";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { isAuthConfigured } from "@/lib/supabase/public-env";

/** PKCE return from Supabase's default confirmation verify link. */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const queryFailure = authLinkFailureFromParams(url.searchParams);
  if (queryFailure) redirect(authErrorPath(queryFailure));

  const code = url.searchParams.get("code");
  if (!code) {
    return new NextResponse(callbackHashHandoffDocument(), {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  }

  if (!isAuthConfigured()) redirect(authErrorPath({ errorCode: "exchange_failed" }));

  const supabase = await createAuthServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) redirect(authErrorPath(exchangeFailure(error)));
  redirect(callbackSuccessPath(url.searchParams.get("next")));
}
