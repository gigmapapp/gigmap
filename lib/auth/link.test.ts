import assert from "node:assert/strict";
import test from "node:test";
import {
  AUTH_LINK_EXPIRED_MESSAGE,
  AUTH_LINK_GENERIC_MESSAGE,
  AUTH_LINK_SAME_BROWSER_MESSAGE,
  authErrorPath,
  authLinkFailureFromParams,
  callbackHashHandoffDocument,
  callbackSuccessPath,
  exchangeFailure,
  pkceCallbackUrl,
  presentAuthLinkError,
} from "./link";

test("default templates return through the PKCE callback", () => {
  assert.equal(
    pkceCallbackUrl("https://gigmap.example/", "/account"),
    "https://gigmap.example/auth/callback?next=/account",
  );
  assert.equal(
    pkceCallbackUrl("http://localhost:3000", "/reset-password"),
    "http://localhost:3000/auth/callback?next=/reset-password",
  );
  assert.equal(pkceCallbackUrl("https://gigmap.example", "/elsewhere"), "https://gigmap.example/auth/callback?next=/account");
});

test("callback next stays on this site and recovery lands on reset", () => {
  assert.equal(callbackSuccessPath("/reset-password"), "/reset-password");
  assert.equal(callbackSuccessPath("/account"), "/account");
  assert.equal(callbackSuccessPath("https://evil.example/steal"), "/steal");
  assert.equal(callbackSuccessPath("//evil.example"), "/account");
  assert.equal(callbackSuccessPath(null), "/account");
});

test("supabase error params in the query or the hash become friendly copy", () => {
  const query = new URLSearchParams(
    "error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired",
  );
  assert.deepEqual(authLinkFailureFromParams(query), { errorCode: "otp_expired" });
  assert.equal(presentAuthLinkError("otp_expired").message, AUTH_LINK_EXPIRED_MESSAGE);

  const hash = new URLSearchParams("error=access_denied&error_code=otp_expired&error_description=expired");
  assert.equal(authLinkFailureFromParams(hash)?.errorCode, "otp_expired");
  assert.equal(authErrorPath({ errorCode: "otp_expired" }), "/auth/error?error_code=otp_expired");

  const verifier = exchangeFailure({
    name: "AuthPKCECodeVerifierMissingError",
    code: "pkce_code_verifier_not_found",
    message: "PKCE code verifier not found in storage. This can happen if the auth flow was initiated in a different browser or device.",
  });
  assert.equal(verifier.errorCode, "pkce_verifier_missing");
  assert.equal(presentAuthLinkError(verifier.errorCode).message, AUTH_LINK_SAME_BROWSER_MESSAGE);
  assert.equal(presentAuthLinkError("missing_code").message, AUTH_LINK_SAME_BROWSER_MESSAGE);

  const flow = authLinkFailureFromParams(
    new URLSearchParams("error_code=flow_state_expired&error_description=Flow+state+has+expired"),
  );
  assert.equal(flow?.errorCode, "flow_state_expired");
  assert.equal(presentAuthLinkError(flow?.errorCode).message, AUTH_LINK_SAME_BROWSER_MESSAGE);

  const unknown = presentAuthLinkError("unexpected_provider_code");
  assert.equal(unknown.message, AUTH_LINK_GENERIC_MESSAGE);
  assert.doesNotMatch(unknown.message, /unexpected_provider_code/);
  assert.equal(authLinkFailureFromParams(new URLSearchParams("next=/account")), null);
});

test("hash-only callback forwards error params the server cannot see", () => {
  const html = callbackHashHandoffDocument();
  assert.match(html, /location\.hash/);
  assert.match(html, /\/auth\/error/);
  assert.match(html, /error_code/);
  assert.match(html, /missing_code/);
  assert.match(html, /same browser where you signed up/);
  assert.doesNotMatch(html, /token_hash/);
});
