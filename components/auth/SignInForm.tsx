"use client";

import { startTransition, useActionState, type FormEvent } from "react";
import {
  AuthAnnouncer,
  AuthField,
  AuthFormError,
  AuthSubmit,
  useAuthFeedback,
} from "@/components/auth/AuthControls";
import { signInFieldErrors } from "@/components/auth/messages";
import type { AuthFormState } from "@/app/actions/auth";

const FIELDS = ["email", "password"] as const;

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
  const feedback = useAuthFeedback(state.error);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const errors = signInFieldErrors(formData);
    if (Object.keys(errors).length > 0) {
      feedback.apply(errors, FIELDS);
      return;
    }
    feedback.apply({}, FIELDS);
    startTransition(() => {
      formAction(formData);
    });
  }

  return (
    <form action={formAction} onSubmit={onSubmit} className="space-y-4" noValidate>
      <AuthAnnouncer message={feedback.announcement} announceKey={feedback.announceKey} />
      <input type="hidden" name="next" value={next} />
      <AuthFormError notice={feedback.formNotice} errorRef={feedback.formErrorRef} />
      <AuthField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        error={feedback.fieldErrors.email}
        inputRef={feedback.bind("email")}
        onChange={() => feedback.clear("email")}
      />
      <AuthField
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        error={feedback.fieldErrors.password}
        inputRef={feedback.bind("password")}
        onChange={() => feedback.clear("password")}
      />
      <AuthSubmit pending={pending} idle="Sign in" busy="Signing in…" />
    </form>
  );
}
