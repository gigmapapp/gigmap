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
  assert.equal(presentAuthError("Invalid login credentials").message, "That email or password is wrong.");
  assert.equal(presentAuthError("Email not confirmed").title, "Confirm your email");
  assert.match(presentAuthError("User already registered").message, /already exists/i);
  assert.equal(presentAuthError("Something else from the provider").message, "Something else from the provider");
});

test("password and email problems stay on the field", () => {
  assert.deepEqual(splitAuthError("Enter a valid email address.").fields, {
    email: "Enter a valid email address.",
  });
  assert.equal(splitAuthError("Use at least 8 characters.").form, null);
  assert.equal(splitAuthError("Passwords do not match.").fields.confirm, "Passwords do not match.");
  assert.equal(splitAuthError("Invalid login credentials").form?.kind, "credentials");
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
