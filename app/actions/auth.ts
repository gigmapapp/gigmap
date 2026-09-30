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
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { isAuthConfigured } from "@/lib/supabase/public-env";

export type AuthFormState = {
  error: string | null;
  message: string | null;
};

async function authClient() {
  if (!isAuthConfigured()) return null;
  return createAuthServerClient();
}

export async function signInAction(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const next = safeNextPath(String(formData.get("next") ?? "/"));
  const emailError = validateEmail(String(formData.get("email") ?? ""));
  if (emailError) return { error: emailError, message: null };
  const password = String(formData.get("password") ?? "");
  const passwordError = validatePassword(password);
  if (passwordError) return { error: passwordError, message: null };

  const supabase = await authClient();
  if (!supabase) return { error: authUnavailableMessage(), message: null };

  const { error } = await supabase.auth.signInWithPassword({
    email: normalizeEmail(String(formData.get("email") ?? "")),
    password,
  });
  if (error) return { error: error.message, message: null };
  redirect(next);
}

export async function signUpAction(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const emailError = validateEmail(String(formData.get("email") ?? ""));
  if (emailError) return { error: emailError, message: null };
  const password = String(formData.get("password") ?? "");
  const passwordError = validatePassword(password);
  if (passwordError) return { error: passwordError, message: null };
  if (password !== String(formData.get("confirm") ?? "")) {
    return { error: "Passwords do not match.", message: null };
  }

  const supabase = await authClient();
  if (!supabase) return { error: authUnavailableMessage(), message: null };

  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: await authCallbackUrl("/account"),
    },
  });
  if (error) return { error: error.message, message: null };
  if (data.session) redirect("/account");
  return {
    error: null,
    message: "Check your email for a confirmation link, then come back to finish your profile.",
  };
}

export async function forgotPasswordAction(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const emailError = validateEmail(String(formData.get("email") ?? ""));
  if (emailError) return { error: emailError, message: null };
  const supabase = await authClient();
  if (!supabase) return { error: authUnavailableMessage(), message: null };

  const { error } = await supabase.auth.resetPasswordForEmail(
    normalizeEmail(String(formData.get("email") ?? "")),
    { redirectTo: await authCallbackUrl("/reset-password") },
  );
  if (error) return { error: error.message, message: null };
  return {
    error: null,
    message: "If that email has an account, a reset link is on its way.",
  };
}

export async function updatePasswordAction(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const password = String(formData.get("password") ?? "");
  const passwordError = validatePassword(password);
  if (passwordError) return { error: passwordError, message: null };
  if (password !== String(formData.get("confirm") ?? "")) {
    return { error: "Passwords do not match.", message: null };
  }
  const supabase = await authClient();
  if (!supabase) return { error: authUnavailableMessage(), message: null };
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims.sub) {
    return { error: "Open the reset link from your email, then choose a new password.", message: null };
  }
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message, message: null };
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
