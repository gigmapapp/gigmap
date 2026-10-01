/**
 * Auth actions return this shape. Branch on `code`, which is mapped from
 * Supabase AuthApiError.code. Provider message text is not used to classify.
 */

export const AUTH_ERROR_CODES = [
  "invalid_credentials",
  "email_not_confirmed",
  "user_already_exists",
  "weak_password",
  "rate_limited",
  "validation",
  "unknown",
] as const;

export type AuthErrorCode = (typeof AUTH_ERROR_CODES)[number];

export type AuthActionFailure = {
  ok: false;
  field?: string;
  code: AuthErrorCode;
  message: string;
};

export type AuthActionSuccess = {
  ok: true;
  message?: string;
};

export type AuthActionResult = AuthActionFailure | AuthActionSuccess;

export const PROFILE_FIELDS = ["name", "category", "bio", "city", "genres"] as const;
export type ProfileField = (typeof PROFILE_FIELDS)[number];
export type ProfileFieldErrors = Partial<Record<ProfileField, string>>;

/** Booking-action shape (`fieldErrors` / `formError`) plus the shared auth code. */
export type ProfileActionFailure = AuthActionFailure & {
  fieldErrors: ProfileFieldErrors;
  formError?: string;
};

export type ProfileActionResult = AuthActionSuccess | ProfileActionFailure;

const PROVIDER_CODES: Record<string, AuthErrorCode> = {
  invalid_credentials: "invalid_credentials",
  email_not_confirmed: "email_not_confirmed",
  user_already_exists: "user_already_exists",
  email_exists: "user_already_exists",
  weak_password: "weak_password",
  over_email_send_rate_limit: "rate_limited",
  over_sms_send_rate_limit: "rate_limited",
  over_request_rate_limit: "rate_limited",
  validation_failed: "validation",
};

export const CONFIRMATION_RESENT_MESSAGE =
  "If that email is waiting for confirmation, we've sent a new link.";

export const PROFILE_VALIDATION_SUMMARY = "Please fix the highlighted fields.";

export const PROFILE_ALREADY_EXISTS_MESSAGE = "You already have a profile.";

export const PASSWORD_RESET_MESSAGE =
  "If that email has an account, a reset link is on its way.";

export function messageForAuthCode(code: AuthErrorCode, fallback?: string): string {
  switch (code) {
    case "invalid_credentials":
      return "That email or password is wrong.";
    case "email_not_confirmed":
      return "Open the confirmation link from your inbox, then sign in.";
    case "user_already_exists":
      return "An account with that email already exists. Sign in instead.";
    case "weak_password":
      return "Choose a stronger password.";
    case "rate_limited":
      return "Too many attempts. Wait a bit and try again.";
    case "validation":
      return fallback || "Check the form and try again.";
    case "unknown":
      return fallback || "Something went wrong. Try again.";
  }
}

export function authFailure(code: AuthErrorCode, message: string, field?: string): AuthActionFailure {
  return field ? { ok: false, code, message, field } : { ok: false, code, message };
}

export function authErrorFromProvider(error: {
  code?: string | null;
  message?: string | null;
}): AuthActionFailure {
  const code = (error.code && PROVIDER_CODES[error.code]) || "unknown";
  const message =
    code === "unknown"
      ? messageForAuthCode("unknown", error.message?.trim() || undefined)
      : code === "validation"
        ? messageForAuthCode("validation", error.message?.trim() || undefined)
        : messageForAuthCode(code);
  return authFailure(code, message, code === "weak_password" ? "password" : undefined);
}

/** Codes that would tell a caller the address is not registered. */
export function hidesAccountExistence(code: string | null | undefined): boolean {
  return code === "user_not_found";
}

export function neutralEmailOutcome(
  error: { code?: string | null; message?: string | null } | null,
  successMessage: string,
): AuthActionResult {
  if (!error || hidesAccountExistence(error.code)) {
    return { ok: true, message: successMessage };
  }
  const mapped = authErrorFromProvider(error);
  if (mapped.code === "rate_limited") return mapped;
  if (mapped.code === "unknown") {
    return authFailure("unknown", "Could not send the email. Try again.");
  }
  return mapped;
}

export function profileValidationFailure(fieldErrors: ProfileFieldErrors): ProfileActionFailure {
  const field = PROFILE_FIELDS.find((name) => fieldErrors[name]);
  return {
    ok: false,
    code: "validation",
    field,
    message: PROFILE_VALIDATION_SUMMARY,
    fieldErrors,
    formError: PROFILE_VALIDATION_SUMMARY,
  };
}

export function profileAlreadyExistsFailure(): ProfileActionFailure {
  return profileFormFailure(PROFILE_ALREADY_EXISTS_MESSAGE, "validation");
}

export function profileFormFailure(message: string, code: AuthErrorCode = "unknown"): ProfileActionFailure {
  return { ok: false, code, message, fieldErrors: {}, formError: message };
}
