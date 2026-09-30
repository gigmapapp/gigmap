"use client";

import { useActionState } from "react";
import { AuthStatus, authButtonClass, authFieldClass } from "@/components/auth/AuthFrame";
import type { AuthFormState } from "@/app/actions/auth";

export default function SignInForm({
  action,
  next,
  initialError,
}: {
  action: (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  next: string;
  initialError?: string | null;
}) {
  const [state, formAction, pending] = useActionState(action, {
    error: initialError ?? null,
    message: null,
  });

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <AuthStatus error={state.error} message={state.message} />
      <label className="block text-sm text-zinc-300">
        Email
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          className={authFieldClass}
        />
      </label>
      <label className="block text-sm text-zinc-300">
        Password
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={authFieldClass}
        />
      </label>
      <button type="submit" disabled={pending} className={authButtonClass}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
