"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  LEGACY_STUB_COOKIE,
  authUnavailableMessage,
  normalizeEmail,
  safeNextPath,
  validateEmail,
  validatePassword,
} from "@/lib/auth/access";
import { authCallbackUrl } from "@/lib/auth/site";
import {
  CONFIRMATION_RESENT_MESSAGE,
  PASSWORD_RESET_MESSAGE,
  type AuthActionResult,
  authErrorFromProvider,
  authFailure,
  neutralEmailOutcome,
} from "@/lib/auth/result";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { isAuthConfigured } from "@/lib/supabase/public-env";

async function authClient() {
  if (!isAuthConfigured()) return null;
  return createAuthServerClient();
}

function validationFailure(field: string, message: string): AuthActionResult {
  return authFailure("validation", message, field);
}

function unavailable(): AuthActionResult {
  return authFailure("unknown", authUnavailableMessage());
}

export async function signInAction(
  _state: AuthActionResult,
  formData: FormData,
): Promise<AuthActionResult> {
  const next = safeNextPath(String(formData.get("next") ?? "/"));
  const emailError = validateEmail(String(formData.get("email") ?? ""));
  if (emailError) return validationFailure("email", emailError);
  const password = String(formData.get("password") ?? "");
  const passwordError = validatePassword(password);
  if (passwordError) return validationFailure("password", passwordError);

  const supabase = await authClient();
  if (!supabase) return unavailable();

  const { error } = await supabase.auth.signInWithPassword({
    email: normalizeEmail(String(formData.get("email") ?? "")),
    password,
  });
  if (error) return authErrorFromProvider(error);
  redirect(next);
}

export async function signUpAction(
  _state: AuthActionResult,
  formData: FormData,
): Promise<AuthActionResult> {
  const emailError = validateEmail(String(formData.get("email") ?? ""));
  if (emailError) return validationFailure("email", emailError);
  const password = String(formData.get("password") ?? "");
  const passwordError = validatePassword(password);
  if (passwordError) return validationFailure("password", passwordError);
  if (password !== String(formData.get("confirm") ?? "")) {
    return validationFailure("confirm", "Passwords do not match.");
  }

  const supabase = await authClient();
  if (!supabase) return unavailable();

  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: await authCallbackUrl("/account"),
    },
  });
  if (error) return authErrorFromProvider(error);
  if (data.session) redirect("/account");
  if (data.user && data.user.identities?.length === 0) {
    return { ok: true, alreadyRegistered: true };
  }
  return {
    ok: true,
    message: "Check your email for a confirmation link, then come back to finish your profile.",
  };
}

export async function forgotPasswordAction(
  _state: AuthActionResult,
  formData: FormData,
): Promise<AuthActionResult> {
  const emailError = validateEmail(String(formData.get("email") ?? ""));
  if (emailError) return validationFailure("email", emailError);
  const supabase = await authClient();
  if (!supabase) return unavailable();

  const { error } = await supabase.auth.resetPasswordForEmail(
    normalizeEmail(String(formData.get("email") ?? "")),
    { redirectTo: await authCallbackUrl("/reset-password") },
  );
  return neutralEmailOutcome(error, PASSWORD_RESET_MESSAGE);
}

export async function resendConfirmationAction(
  _state: AuthActionResult,
  formData: FormData,
): Promise<AuthActionResult> {
  const emailError = validateEmail(String(formData.get("email") ?? ""));
  if (emailError) return validationFailure("email", emailError);
  const supabase = await authClient();
  if (!supabase) return unavailable();

  const { error } = await supabase.auth.resend({
    type: "signup",
    email: normalizeEmail(String(formData.get("email") ?? "")),
    options: {
      emailRedirectTo: await authCallbackUrl("/account"),
    },
  });
  return neutralEmailOutcome(error, CONFIRMATION_RESENT_MESSAGE);
}

export async function updatePasswordAction(
  _state: AuthActionResult,
  formData: FormData,
): Promise<AuthActionResult> {
  const password = String(formData.get("password") ?? "");
  const passwordError = validatePassword(password);
  if (passwordError) return validationFailure("password", passwordError);
  if (password !== String(formData.get("confirm") ?? "")) {
    return validationFailure("confirm", "Passwords do not match.");
  }
  const supabase = await authClient();
  if (!supabase) return unavailable();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims.sub) {
    return authFailure("unknown", "Open the reset link from your email, then choose a new password.");
  }
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return authErrorFromProvider(error);
  redirect("/account");
}

export async function signOutAction() {
  if (isAuthConfigured()) {
    const supabase = await createAuthServerClient();
    await supabase.auth.signOut();
  }
  const store = await cookies();
  store.delete(LEGACY_STUB_COOKIE);
  revalidatePath("/", "layout");
  redirect("/");
}
