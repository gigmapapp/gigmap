"use client";

import Link from "next/link";
import { startTransition, useActionState, useState, type FormEvent } from "react";
import {
  AuthAnnouncer,
  AuthField,
  AuthFormError,
  AuthSubmit,
  ResendConfirmation,
  useAuthFeedback,
} from "@/components/auth/AuthControls";
import { AuthInbox, authTextLinkClass } from "@/components/auth/AuthFrame";
import {
  ALREADY_REGISTERED_MESSAGE,
  SIGN_UP_CHECK_EMAIL_HINT,
  signUpFieldErrors,
} from "@/components/auth/messages";
import type { AuthActionResult } from "@/lib/auth/result";

const FIELDS = ["email", "password", "confirm"] as const;
const initial: AuthActionResult = { ok: true };

export default function SignUpForm({
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
    const errors = signUpFieldErrors(formData);
    if (Object.keys(errors).length > 0) {
      feedback.apply(errors, FIELDS);
      return;
    }
    feedback.apply({}, FIELDS);
    startTransition(() => {
      formAction(formData);
    });
  }

  if (state.ok && state.alreadyRegistered) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-xl border border-line bg-canvas px-4 py-4 text-sm leading-relaxed break-words text-secondary"
      >
        <p>{ALREADY_REGISTERED_MESSAGE}</p>
        <div className="mt-2 flex flex-col items-start">
          <Link href="/sign-in" className={authTextLinkClass}>
            Sign in
          </Link>
          <Link href="/forgot-password" className={authTextLinkClass}>
            Forgot password
          </Link>
        </div>
      </div>
    );
  }

  if (state.ok && state.message) {
    return (
      <div>
        <AuthInbox title="Check your email" email={sentTo} body={state.message} />
        <p className="mt-3 text-sm leading-relaxed break-words text-muted">{SIGN_UP_CHECK_EMAIL_HINT}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-4">
          <Link href="/sign-in" className={authTextLinkClass}>
            Sign in
          </Link>
          <Link href="/forgot-password" className={authTextLinkClass}>
            Forgot password
          </Link>
        </div>
        {sentTo ? <ResendConfirmation email={sentTo} /> : null}
      </div>
    );
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
      <AuthField
        label="Password"
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
      <AuthSubmit pending={pending} idle="Create account" busy="Creating account…" />
    </form>
  );
}
