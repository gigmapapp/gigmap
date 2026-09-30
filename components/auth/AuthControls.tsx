"use client";

import { startTransition, useEffect, useId, useRef, useState, type ReactNode, type RefObject } from "react";
import { resendConfirmationAction } from "@/app/actions/auth";
import { authButtonClass, authFieldClass, authSecondaryButtonClass } from "@/components/auth/AuthFrame";
import { splitAuthError, type AuthFieldErrors, type AuthNotice } from "@/components/auth/messages";
import type { AuthActionResult } from "@/lib/auth/result";

export function useAuthFeedback(state: AuthActionResult) {
  const serverError = state.ok ? null : state;
  const errorKey = serverError ? `${serverError.code}:${serverError.field ?? ""}:${serverError.message}` : "";
  const [clientErrors, setClientErrors] = useState<AuthFieldErrors>({});
  const [hidden, setHidden] = useState<string[]>([]);
  const [seenError, setSeenError] = useState(errorKey);
  const [announcement, setAnnouncement] = useState("");
  const [announceKey, setAnnounceKey] = useState(0);
  const refs = useRef(new Map<string, HTMLElement>());
  const focusRequest = useRef<string | null>(null);
  const formErrorRef = useRef<HTMLDivElement | null>(null);

  let hiddenFields = hidden;
  let localClientErrors = clientErrors;
  if (errorKey !== seenError) {
    setSeenError(errorKey);
    setHidden([]);
    setClientErrors({});
    hiddenFields = [];
    localClientErrors = {};
  }

  const split = splitAuthError(serverError);
  const serverFields = Object.fromEntries(
    Object.entries(split.fields).filter(([name]) => !hiddenFields.includes(name)),
  );
  const fieldErrors = { ...serverFields, ...localClientErrors };
  const formNotice = Object.keys(localClientErrors).length > 0 ? null : split.form;

  useEffect(() => {
    const target = focusRequest.current;
    if (!target) return;
    focusRequest.current = null;
    refs.current.get(target)?.focus();
  }, [clientErrors, announceKey]);

  useEffect(() => {
    if (!serverError) return;
    const fields = splitAuthError(serverError).fields;
    const first = Object.keys(fields)[0];
    if (first) {
      refs.current.get(first)?.focus();
      return;
    }
    formErrorRef.current?.focus();
  }, [errorKey, serverError]);

  function apply(errors: AuthFieldErrors, order: readonly string[]) {
    const summary = order
      .map((name) => errors[name])
      .filter((message): message is string => Boolean(message))
      .join(" ");
    focusRequest.current = order.find((name) => errors[name]) ?? null;
    setClientErrors(errors);
    setAnnouncement(summary);
    if (summary) setAnnounceKey((key) => key + 1);
  }

  function clear(name: string) {
    setClientErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
    setHidden((current) => (current.includes(name) ? current : [...current, name]));
  }

  function bind(name: string) {
    return (node: HTMLElement | null) => {
      if (node) refs.current.set(name, node);
      else refs.current.delete(name);
    };
  }

  return {
    fieldErrors,
    formNotice,
    announcement,
    announceKey,
    formErrorRef,
    apply,
    clear,
    bind,
  };
}

export function AuthAnnouncer({
  message,
  announceKey,
}: {
  message: string;
  announceKey: number;
}) {
  if (!message) return null;
  return (
    <p key={announceKey} role="alert" className="sr-only">
      {message}
    </p>
  );
}

export function ResendConfirmation({ email }: { email: string }) {
  const [state, setState] = useState<AuthActionResult>({ ok: true });
  const [pending, setPending] = useState(false);

  function onClick() {
    const data = new FormData();
    data.set("email", email);
    setPending(true);
    startTransition(() => {
      void resendConfirmationAction({ ok: true }, data)
        .then(setState)
        .finally(() => setPending(false));
    });
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={onClick}
        disabled={pending || !email}
        className={`${authSecondaryButtonClass} disabled:cursor-wait disabled:opacity-70`}
      >
        {pending ? "Sending…" : "Resend confirmation email"}
      </button>
      {state.ok && state.message ? (
        <p role="status" className="mt-3 text-sm text-zinc-300">
          {state.message}
        </p>
      ) : null}
      {!state.ok ? (
        <p role="alert" className="auth-form-error mt-3 rounded-lg border px-3 py-3 text-sm">
          {state.message}
        </p>
      ) : null}
    </div>
  );
}

export function AuthFormError({
  notice,
  errorRef,
}: {
  notice: AuthNotice | null;
  errorRef?: RefObject<HTMLDivElement | null>;
}) {
  if (!notice) return null;
  return (
    <div
      ref={errorRef}
      tabIndex={-1}
      role="alert"
      className="auth-form-error rounded-lg border px-3 py-3 text-sm outline-none"
    >
      {notice.title ? <p className="font-medium">{notice.title}</p> : null}
      <p className={notice.title ? "mt-1" : undefined}>{notice.message}</p>
    </div>
  );
}

export function AuthSubmit({
  pending,
  idle,
  busy,
}: {
  pending: boolean;
  idle: string;
  busy: string;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={authButtonClass}
    >
      {pending ? <Spinner /> : null}
      <span>{pending ? busy : idle}</span>
    </button>
  );
}

export function AuthField({
  label,
  name,
  type = "text",
  autoComplete,
  required,
  placeholder,
  defaultValue,
  hint,
  error,
  multiline,
  rows = 4,
  options,
  inputRef,
  onChange,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
  hint?: string;
  error?: string;
  multiline?: boolean;
  rows?: number;
  options?: { value: string; label: string }[];
  inputRef?: (node: HTMLElement | null) => void;
  onChange?: () => void;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const invalid = Boolean(error);
  const describedBy = invalid ? errorId : hint ? hintId : undefined;
  const [visible, setVisible] = useState(false);
  const password = type === "password" && !options && !multiline;
  const controlType = password && visible ? "text" : type;
  const controlClass = `${authFieldClass}${password ? " pr-14" : ""}`;

  const shared = {
    id,
    name,
    required,
    placeholder,
    defaultValue,
    "aria-invalid": invalid || undefined,
    "aria-describedby": describedBy,
    className: controlClass,
    onChange,
  };

  let control: ReactNode;
  if (options) {
    control = (
      <select {...shared} ref={inputRef} defaultValue={defaultValue}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  } else if (multiline) {
    control = <textarea {...shared} ref={inputRef} rows={rows} className={`${controlClass} resize-y`} />;
  } else {
    control = (
      <input
        {...shared}
        ref={inputRef}
        type={controlType}
        autoComplete={autoComplete}
        autoCapitalize={type === "email" ? "none" : undefined}
        spellCheck={type === "email" ? false : undefined}
      />
    );
  }

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-zinc-200">
        {label}
      </label>
      <div className="relative mt-1.5">
        {control}
        {password ? (
          <button
            type="button"
            className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center text-zinc-400 hover:text-white"
            aria-pressed={visible}
            aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
            onClick={() => setVisible((current) => !current)}
          >
            {visible ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        ) : null}
      </div>
      {hint && !invalid ? (
        <p id={hintId} className="mt-1.5 text-sm text-zinc-500">
          {hint}
        </p>
      ) : null}
      {invalid ? (
        <p id={errorId} className="mt-1.5 text-sm text-accent">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function Spinner() {
  return (
    <span
      className="size-4 animate-spin rounded-full border-2 border-zinc-950/25 border-t-zinc-950"
      aria-hidden="true"
    />
  );
}

function EyeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M2.5 12S6 6.5 12 6.5 21.5 12 21.5 12 18 17.5 12 17.5 2.5 12 2.5 12Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 5l16 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M9.5 6.8A9.8 9.8 0 0 1 12 6.5c6 0 9.5 5.5 9.5 5.5a16 16 0 0 1-3.2 3.6M6.1 8.2C3.8 9.8 2.5 12 2.5 12S6 17.5 12 17.5c1.1 0 2.1-.2 3-.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
