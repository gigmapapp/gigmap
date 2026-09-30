import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { LEGACY_STUB_COOKIE } from "@/lib/auth/access";
import { isAuthConfigured, supabaseAnonKey, supabaseUrl } from "@/lib/supabase/public-env";

/**
 * Refresh the auth cookies. Call getClaims immediately after creating the client
 * so a rotated refresh token is written onto this response.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  if (isAuthConfigured()) {
    const url = supabaseUrl();
    const key = supabaseAnonKey();
    if (url && key) {
      const supabase = createServerClient(url, key, {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[], headers: Record<string, string>) {
            cookiesToSet.forEach(({ name, value }) => {
              request.cookies.set(name, value);
            });
            response = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
            for (const [header, value] of Object.entries(headers)) {
              response.headers.set(header, value);
            }
          },
        },
      });

      try {
        await supabase.auth.getClaims();
      } catch (error) {
        console.error("Auth session refresh failed.", error);
      }
    }
  }

  if (request.cookies.has(LEGACY_STUB_COOKIE)) {
    response.cookies.set(LEGACY_STUB_COOKIE, "", { path: "/", maxAge: 0 });
  }

  return response;
}
