import { validateEmail, validatePassword } from "../../lib/auth/access";
import { collectProfileFieldErrors } from "../../lib/auth/profile-update";
import {
  messageForAuthCode,
  type AuthActionFailure,
  type AuthErrorCode,
} from "../../lib/auth/result";

export type AuthFieldErrors = Record<string, string>;

export type AuthNotice = {
  kind: "credentials" | "unconfirmed" | "taken" | "generic";
  title?: string;
  message: string;
};

/** Turn an auth result code into the short messages the forms show. */
export function presentAuthError(error: { code: AuthErrorCode; message: string }): AuthNotice {
  switch (error.code) {
    case "invalid_credentials":
      return { kind: "credentials", message: messageForAuthCode("invalid_credentials") };
    case "email_not_confirmed":
      return {
        kind: "unconfirmed",
        title: "Confirm your email",
        message: messageForAuthCode("email_not_confirmed"),
      };
    case "user_already_exists":
      return { kind: "taken", message: messageForAuthCode("user_already_exists") };
    case "rate_limited":
      return { kind: "generic", message: messageForAuthCode("rate_limited") };
    default:
      return { kind: "generic", message: error.message };
  }
}

export function splitAuthError(error: AuthActionFailure | null): {
  fields: AuthFieldErrors;
  form: AuthNotice | null;
} {
  if (!error) return { fields: {}, form: null };
  if (error.field && (error.code === "validation" || error.code === "weak_password")) {
    return { fields: { [error.field]: error.message }, form: null };
  }
  return { fields: {}, form: presentAuthError(error) };
}

export function signInFieldErrors(formData: FormData): AuthFieldErrors {
  const errors: AuthFieldErrors = {};
  const emailError = validateEmail(String(formData.get("email") ?? ""));
  if (emailError) errors.email = emailError;
  const passwordError = validatePassword(String(formData.get("password") ?? ""));
  if (passwordError) errors.password = passwordError;
  return errors;
}

export function signUpFieldErrors(formData: FormData): AuthFieldErrors {
  return passwordPairErrors(formData, true);
}

export function forgotFieldErrors(formData: FormData): AuthFieldErrors {
  const errors: AuthFieldErrors = {};
  const emailError = validateEmail(String(formData.get("email") ?? ""));
  if (emailError) errors.email = emailError;
  return errors;
}

export function resetFieldErrors(formData: FormData): AuthFieldErrors {
  return passwordPairErrors(formData, false);
}

export function profileFieldErrors(formData: FormData): AuthFieldErrors {
  return collectProfileFieldErrors({
    name: String(formData.get("name") ?? ""),
    category: String(formData.get("category") ?? ""),
  });
}

function passwordPairErrors(formData: FormData, includeEmail: boolean): AuthFieldErrors {
  const errors: AuthFieldErrors = {};
  if (includeEmail) {
    const emailError = validateEmail(String(formData.get("email") ?? ""));
    if (emailError) errors.email = emailError;
  }
  const password = String(formData.get("password") ?? "");
  const passwordError = validatePassword(password);
  if (passwordError) errors.password = passwordError;
  if (password !== String(formData.get("confirm") ?? "")) {
    errors.confirm = "Passwords do not match.";
  }
  return errors;
}
