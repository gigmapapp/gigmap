import assert from "node:assert/strict";
import test from "node:test";
import {
  forgotFieldErrors,
  presentAuthError,
  profileFieldErrors,
  resetFieldErrors,
  signInFieldErrors,
  signUpFieldErrors,
  splitAuthError,
} from "./messages";

test("auth errors use the short account copy", () => {
  assert.equal(
    presentAuthError({ code: "invalid_credentials", message: "Email not confirmed" }).message,
    "That email or password is wrong.",
  );
  assert.equal(
    presentAuthError({ code: "email_not_confirmed", message: "Invalid login credentials" }).title,
    "Confirm your email",
  );
  assert.match(
    presentAuthError({ code: "user_already_exists", message: "User already registered" }).message,
    /already exists/i,
  );
  assert.equal(
    presentAuthError({ code: "unknown", message: "Something else from the provider" }).message,
    "Something else from the provider",
  );
  assert.equal(presentAuthError({ code: "rate_limited", message: "User not found" }).message, "Too many attempts. Wait a bit and try again.");
});

test("password and email problems stay on the field", () => {
  assert.deepEqual(
    splitAuthError({
      ok: false,
      code: "validation",
      field: "email",
      message: "Enter a valid email address.",
    }).fields,
    { email: "Enter a valid email address." },
  );
  assert.equal(
    splitAuthError({
      ok: false,
      code: "validation",
      field: "password",
      message: "Use at least 8 characters.",
    }).form,
    null,
  );
  assert.equal(
    splitAuthError({
      ok: false,
      code: "validation",
      field: "confirm",
      message: "Passwords do not match.",
    }).fields.confirm,
    "Passwords do not match.",
  );
  assert.equal(
    splitAuthError({
      ok: false,
      code: "weak_password",
      message: "Password should be at least 6 characters",
    }).fields.password,
    "Choose a stronger password.",
  );
  assert.equal(
    splitAuthError({
      ok: false,
      code: "invalid_credentials",
      message: "Email not confirmed",
    }).form?.kind,
    "credentials",
  );
  assert.equal(
    splitAuthError({ ok: false, code: "invalid_credentials", message: "Invalid login credentials" }).fields
      .password,
    undefined,
  );
  assert.match(
    splitAuthError({ ok: false, code: "rate_limited", message: "over_email_send_rate_limit" }).form?.message ?? "",
    /wait a bit/i,
  );
  assert.equal(splitAuthError(null).form, null);
});

test("forms reject the same cases the account actions reject", () => {
  const signIn = signInFieldErrors(form({ email: "nope", password: "short" }));
  assert.match(signIn.email ?? "", /email/i);
  assert.match(signIn.password ?? "", /8/);

  const signUp = signUpFieldErrors(
    form({ email: "fan@example.com", password: "long-enough", confirm: "different" }),
  );
  assert.equal(signUp.confirm, "Passwords do not match.");
  assert.equal(Object.keys(forgotFieldErrors(form({ email: "fan@example.com" }))).length, 0);

  const reset = resetFieldErrors(form({ password: "tiny", confirm: "tiny" }));
  assert.match(reset.password ?? "", /8/);
  assert.equal(reset.confirm, undefined);

  const profile = profileFieldErrors(form({ name: "  ", category: "solo" }));
  assert.match(profile.name ?? "", /name/i);
});

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}
