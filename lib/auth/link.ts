import { safeNextPath } from "@/lib/auth/access";

/**
 * Default Supabase templates send {{ .ConfirmationURL }} through the project's
 * verify endpoint, which then redirects here with a PKCE code. The query string
 * is part of the Auth redirect allow-list match, so these URLs stay exact.
 */
export function pkceCallbackUrl(siteUrl: string, nextPath: string): string {
  const site = siteUrl.trim().replace(/\/$/, "");
  const next = nextPath === "/reset-password" ? "/reset-password" : "/account";
  return `${site}/auth/callback?next=${next}`;
}

export const AUTH_LINK_SAME_BROWSER_MESSAGE =
  "Open the link in the same browser where you signed up, or sign in and request a new link.";

export const AUTH_LINK_EXPIRED_MESSAGE =
  "That link has expired. Request a new one, and open it in the same browser where you signed up.";

export const AUTH_LINK_GENERIC_MESSAGE =
  "That link did not work. Sign in, or request a new link and open it in the same browser.";

export type AuthLinkFailure = { errorCode: string };

export function callbackSuccessPath(next: string | null | undefined): string {
  return safeNextPath(next, "/account");
}

export function classifyAuthRedirect(input: {
  error?: string | null;
  errorCode?: string | null;
  errorDescription?: string | null;
}): string | null {
  const errorCode = (input.errorCode ?? "").trim().toLowerCase();
  const description = (input.errorDescription ?? "").trim().toLowerCase();
  const error = (input.error ?? "").trim().toLowerCase();
  if (!errorCode && !description && !error) return null;

  if (
    errorCode === "pkce_code_verifier_not_found" ||
    errorCode === "pkce_verifier_missing" ||
    description.includes("code verifier") ||
    error === "authpkcecodeverifiermissingerror"
  ) {
    return "pkce_verifier_missing";
  }
  if (errorCode === "flow_state_expired" || errorCode === "flow_state_not_found" || errorCode === "missing_code") {
    return errorCode;
  }
  if (errorCode === "otp_expired" || errorCode === "otp_disabled" || description.includes("expired")) {
    return "otp_expired";
  }
  if (/^[a-z0-9_]{1,64}$/.test(errorCode)) return errorCode;
  return "exchange_failed";
}

export function authLinkFailureFromParams(params: URLSearchParams): AuthLinkFailure | null {
  const errorCode = classifyAuthRedirect({
    error: params.get("error"),
    errorCode: params.get("error_code"),
    errorDescription: params.get("error_description"),
  });
  return errorCode ? { errorCode } : null;
}

export function exchangeFailure(error: { code?: string | null; message?: string | null; name?: string | null }): AuthLinkFailure {
  return {
    errorCode:
      classifyAuthRedirect({
        error: error.name,
        errorCode: error.code,
        errorDescription: error.message,
      }) ?? "exchange_failed",
  };
}

export function authErrorPath(failure: AuthLinkFailure): string {
  const errorCode = /^[a-z0-9_]{1,64}$/.test(failure.errorCode) ? failure.errorCode : "exchange_failed";
  return `/auth/error?error_code=${encodeURIComponent(errorCode)}`;
}

export function presentAuthLinkError(errorCode: string | null | undefined): { title: string; message: string } {
  switch (errorCode) {
    case "otp_expired":
      return { title: "That link has expired", message: AUTH_LINK_EXPIRED_MESSAGE };
    case "pkce_verifier_missing":
    case "missing_code":
    case "flow_state_expired":
    case "flow_state_not_found":
      return { title: "Open the link in the same browser", message: AUTH_LINK_SAME_BROWSER_MESSAGE };
    default:
      return { title: "That link did not work", message: AUTH_LINK_GENERIC_MESSAGE };
  }
}

/** Reads a hash-only Supabase error redirect. The server never sees the fragment. */
export function callbackHashHandoffDocument(): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="referrer" content="no-referrer">
  <title>Checking the link</title>
</head>
<body>
  <p>${AUTH_LINK_SAME_BROWSER_MESSAGE}</p>
  <p><a href="/sign-in">Sign in</a> or <a href="/forgot-password">request a new link</a>.</p>
  <script>
    (function () {
      var hash = new URLSearchParams(location.hash.charAt(0) === "#" ? location.hash.slice(1) : location.hash);
      var next = new URL("/auth/error", location.origin);
      ["error", "error_code", "error_description"].forEach(function (key) {
        var value = hash.get(key);
        if (value) next.searchParams.set(key, value.slice(0, 300));
      });
      if (!next.search) next.searchParams.set("error_code", "missing_code");
      location.replace(next.pathname + next.search);
    })();
  </script>
</body>
</html>`;
}
