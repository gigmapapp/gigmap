import { parseProfileFields, validateEmail, validatePassword } from "../../lib/auth/access";

export type AuthFieldErrors = Record<string, string>;

export type AuthNotice = {
  kind: "credentials" | "unconfirmed" | "taken" | "generic";
  title?: string;
  message: string;
};

/** Turn provider copy into the short messages the forms show. */
export function presentAuthError(error: string): AuthNotice {
  if (/invalid login credentials|invalid email or password/i.test(error)) {
    return { kind: "credentials", message: "That email or password is wrong." };
  }
  if (/email not confirmed/i.test(error)) {
    return {
      kind: "unconfirmed",
      title: "Confirm your email",
      message: "Open the confirmation link from your inbox, then sign in.",
    };
  }
  if (/already registered|already exists|user already/i.test(error)) {
    return {
      kind: "taken",
      message: "An account with that email already exists. Sign in instead.",
    };
  }
  return { kind: "generic", message: error };
}

function fieldMessage(error: string): AuthFieldErrors | null {
  if (/valid email/i.test(error)) return { email: error };
  if (/at least \d+ characters/i.test(error)) return { password: error };
  if (/do not match/i.test(error)) return { confirm: error };
  if (/name is required/i.test(error)) return { name: error };
  if (/solo, band, or dj/i.test(error)) return { category: error };
  return null;
}

export function splitAuthError(error: string | null): {
  fields: AuthFieldErrors;
  form: AuthNotice | null;
} {
  if (!error) return { fields: {}, form: null };
  const fields = fieldMessage(error);
  if (fields) return { fields, form: null };
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
  const parsed = parseProfileFields({
    name: String(formData.get("name") ?? ""),
    category: String(formData.get("category") ?? ""),
    bio: String(formData.get("bio") ?? ""),
    city: String(formData.get("city") ?? ""),
    genres: String(formData.get("genres") ?? ""),
    userId: "pending",
  });
  if (parsed.ok) return {};
  return fieldMessage(parsed.error) ?? { form: parsed.error };
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
