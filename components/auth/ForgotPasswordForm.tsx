"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import {
  AuthAnnouncer,
  AuthField,
  AuthFormError,
  AuthSubmit,
  useAuthFeedback,
} from "@/components/auth/AuthControls";
import { AuthInbox } from "@/components/auth/AuthFrame";
import { forgotFieldErrors } from "@/components/auth/messages";
import type { AuthActionResult } from "@/lib/auth/result";

const FIELDS = ["email"] as const;
const initial: AuthActionResult = { ok: true };

export default function ForgotPasswordForm({
  action,
}: {
  action: (state: AuthActionResult, formData: FormData) => Promise<AuthActionResult>;
}) {
  const [state, formAction, pending] = useActionState(action, initial);
  const feedback = useAuthFeedback(state);
  const [sentTo, setSentTo] = useState<string | null>(null);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setSentTo(String(formData.get("email") ?? "").trim());
    const errors = forgotFieldErrors(formData);
    if (Object.keys(errors).length > 0) {
      feedback.apply(errors, FIELDS);
      return;
    }
    feedback.apply({}, FIELDS);
    startTransition(() => {
      formAction(formData);
    });
  }

  if (state.ok && state.message) {
    return <AuthInbox title="Check your email" email={sentTo} body={state.message} />;
  }

  return (
    <form action={formAction} onSubmit={onSubmit} className="space-y-4" noValidate>
      <AuthAnnouncer message={feedback.announcement} announceKey={feedback.announceKey} />
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
      <AuthSubmit pending={pending} idle="Send reset link" busy="Sending…" />
    </form>
  );
}
