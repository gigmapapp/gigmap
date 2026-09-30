"use client";

import { startTransition, useActionState, type FormEvent } from "react";
import {
  AuthAnnouncer,
  AuthField,
  AuthFormError,
  AuthSubmit,
  useAuthFeedback,
} from "@/components/auth/AuthControls";
import { resetFieldErrors } from "@/components/auth/messages";
import type { AuthActionResult } from "@/lib/auth/result";

const FIELDS = ["password", "confirm"] as const;
const initial: AuthActionResult = { ok: true };

export default function ResetPasswordForm({
  action,
}: {
  action: (state: AuthActionResult, formData: FormData) => Promise<AuthActionResult>;
}) {
  const [state, formAction, pending] = useActionState(action, initial);
  const feedback = useAuthFeedback(state);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const errors = resetFieldErrors(formData);
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
      <AuthFormError notice={feedback.formNotice} errorRef={feedback.formErrorRef} />
      <AuthField
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        hint="At least 8 characters."
        error={feedback.fieldErrors.password}
        inputRef={feedback.bind("password")}
        onChange={() => feedback.clear("password")}
      />
      <AuthField
        label="Confirm password"
        name="confirm"
        type="password"
        autoComplete="new-password"
        required
        error={feedback.fieldErrors.confirm}
        inputRef={feedback.bind("confirm")}
        onChange={() => feedback.clear("confirm")}
      />
      <AuthSubmit pending={pending} idle="Update password" busy="Saving…" />
    </form>
  );
}
