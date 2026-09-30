"use client";

import { useActionState } from "react";
import { AuthStatus, authButtonClass, authFieldClass } from "@/components/auth/AuthFrame";
import type { AuthFormState } from "@/app/actions/auth";

const initial: AuthFormState = { error: null, message: null };

export default function ForgotPasswordForm({
  action,
}: {
  action: (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;
}) {
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <form action={formAction} className="space-y-4">
      <AuthStatus error={state.error} message={state.message} />
      <label className="block text-sm text-zinc-300">
        Email
        <input name="email" type="email" autoComplete="email" required className={authFieldClass} />
      </label>
      <button type="submit" disabled={pending} className={authButtonClass}>
        {pending ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}
