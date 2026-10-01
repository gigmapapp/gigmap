import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  CONFIRMATION_RESENT_MESSAGE,
  PASSWORD_RESET_MESSAGE,
  authErrorFromProvider,
  isRepeatedSignupUser,
  messageForAuthCode,
  neutralEmailOutcome,
  PROFILE_ALREADY_EXISTS_MESSAGE,
  PROFILE_VALIDATION_SUMMARY,
  profileAlreadyExistsFailure,
  profileFormFailure,
  profileValidationFailure,
  type AuthActionResult,
} from "./result";

test("auth error codes come from error.code, not the message", () => {
  assert.equal(
    authErrorFromProvider({ code: "invalid_credentials", message: "Email not confirmed" }).code,
    "invalid_credentials",
  );
  assert.equal(
    authErrorFromProvider({ code: "invalid_credentials", message: "Email not confirmed" }).message,
    messageForAuthCode("invalid_credentials"),
  );
  assert.equal(
    authErrorFromProvider({ code: "email_not_confirmed", message: "Invalid login credentials" }).code,
    "email_not_confirmed",
  );
  assert.equal(
    authErrorFromProvider({ code: "user_already_exists", message: "nope" }).code,
    "user_already_exists",
  );
  assert.equal(authErrorFromProvider({ code: "email_exists", message: "User already registered" }).code, "user_already_exists");
  const weak = authErrorFromProvider({ code: "weak_password", message: "Invalid login credentials" });
  assert.equal(weak.code, "weak_password");
  assert.equal(weak.field, "password");
  assert.equal(
    authErrorFromProvider({ code: "over_email_send_rate_limit", message: "User not found" }).code,
    "rate_limited",
  );
  assert.equal(authErrorFromProvider({ code: "over_request_rate_limit", message: "Email not confirmed" }).code, "rate_limited");
  assert.equal(authErrorFromProvider({ code: "over_sms_send_rate_limit" }).code, "rate_limited");
  assert.equal(
    authErrorFromProvider({ code: "something_new", message: "Invalid login credentials" }).code,
    "unknown",
  );
  assert.equal(authErrorFromProvider({ message: "Invalid login credentials" }).code, "unknown");
  assert.equal(
    authErrorFromProvider({ message: "Invalid login credentials" }).message,
    "Invalid login credentials",
  );
});

test("resend and password reset hide missing accounts and surface rate limits", () => {
  assert.deepEqual(neutralEmailOutcome(null, CONFIRMATION_RESENT_MESSAGE), {
    ok: true,
    message: CONFIRMATION_RESENT_MESSAGE,
  });
  assert.deepEqual(
    neutralEmailOutcome({ code: "user_not_found", message: "User not found" }, CONFIRMATION_RESENT_MESSAGE),
    { ok: true, message: CONFIRMATION_RESENT_MESSAGE },
  );
  assert.deepEqual(
    neutralEmailOutcome({ code: "user_not_found", message: "User not found" }, PASSWORD_RESET_MESSAGE),
    { ok: true, message: PASSWORD_RESET_MESSAGE },
  );
  const limited = neutralEmailOutcome(
    { code: "over_email_send_rate_limit", message: "For security purposes, you can only request this after 60 seconds." },
    CONFIRMATION_RESENT_MESSAGE,
  );
  assert.equal(limited.ok, false);
  if (!limited.ok) {
    assert.equal(limited.code, "rate_limited");
    assert.match(limited.message, /too many attempts/i);
    assert.doesNotMatch(limited.message, /user not found|60 seconds/i);
  }
  const outage = neutralEmailOutcome({ code: "unexpected_failure", message: "User not found" }, CONFIRMATION_RESENT_MESSAGE);
  assert.equal(outage.ok, false);
  if (!outage.ok) {
    assert.equal(outage.code, "unknown");
    assert.doesNotMatch(outage.message, /user not found/i);
  }
});

test("an empty identities array is a repeated signup and anything else is not", () => {
  assert.equal(isRepeatedSignupUser({ identities: [] }), true);
  assert.equal(isRepeatedSignupUser({ identities: [{ id: "email" }] }), false);
  assert.equal(isRepeatedSignupUser({ identities: undefined }), false);
  assert.equal(isRepeatedSignupUser({ identities: null }), false);
  assert.equal(isRepeatedSignupUser(null), false);
  assert.equal(isRepeatedSignupUser(undefined), false);

  const repeated: AuthActionResult = { ok: true, alreadyRegistered: true };
  assert.equal(repeated.ok && repeated.alreadyRegistered, true);
  if (repeated.ok) assert.equal(repeated.message, undefined);

  const auth = readFileSync(new URL("../../app/actions/auth.ts", import.meta.url), "utf8");
  const signUp = auth.slice(auth.indexOf("export async function signUpAction"));
  assert.match(signUp, /data\.user && data\.user\.identities\?\.length === 0/);
  assert.match(signUp, /return \{ ok: true, alreadyRegistered: true \}/);
  assert.doesNotMatch(signUp.slice(0, signUp.indexOf("alreadyRegistered")), /localStorage/);
});

test("profile saves return field errors in the booking shape", () => {
  const invalid = profileValidationFailure({
    name: "Name is required.",
    category: "Pick solo, band, or DJ.",
  });
  assert.equal(invalid.ok, false);
  assert.equal(invalid.code, "validation");
  assert.equal(invalid.field, "name");
  assert.equal(invalid.message, PROFILE_VALIDATION_SUMMARY);
  assert.equal(invalid.formError, PROFILE_VALIDATION_SUMMARY);
  assert.equal(invalid.fieldErrors.name, "Name is required.");
  assert.equal(invalid.fieldErrors.category, "Pick solo, band, or DJ.");

  const existing = profileAlreadyExistsFailure();
  assert.equal(existing.ok, false);
  assert.equal(existing.code, "validation");
  assert.equal(existing.formError, PROFILE_ALREADY_EXISTS_MESSAGE);
  assert.equal(existing.message, PROFILE_ALREADY_EXISTS_MESSAGE);
  assert.deepEqual(existing.fieldErrors, {});

  const refused = profileFormFailure("You can only edit your own profile.");
  assert.deepEqual(refused.fieldErrors, {});
  assert.equal(refused.formError, "You can only edit your own profile.");
  assert.equal(refused.code, "unknown");
});
