import type { ReactNode } from "react";

/** Shared shell for sign-in, sign-up, password, and account screens. */
export default function AuthFrame({
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-lg px-4 py-8 sm:py-14">
      <div className="rounded-2xl border border-line bg-surface p-5 sm:p-8">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">{eyebrow}</p>
        <h1 className="mt-3 break-words font-display text-3xl tracking-tight text-foreground sm:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-3 text-sm leading-relaxed break-words text-muted">{description}</p>
        ) : null}
        <div className="mt-8">{children}</div>
        {footer ? (
          <div className="mt-6 border-t border-line pt-4 text-sm text-muted">{footer}</div>
        ) : null}
      </div>
    </main>
  );
}

export const authFieldClass =
  "auth-field min-h-11 w-full min-w-0 rounded-lg border bg-canvas px-3 py-2.5 text-base text-foreground placeholder:text-muted";

export const authButtonClass =
  "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-3 text-base font-medium text-on-accent hover:bg-accent-hover disabled:cursor-wait disabled:opacity-70";

export const authSecondaryButtonClass =
  "inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-line bg-surface px-4 py-3 text-center text-base font-medium text-foreground hover:bg-surface-hover";

export const authTextLinkClass =
  "inline-flex min-h-11 items-center text-accent underline-offset-4 hover:underline";

export function AuthInbox({
  title,
  body,
  email,
}: {
  title: string;
  body: string;
  email?: string | null;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-xl border border-accent/40 bg-accent/10 px-4 py-4"
    >
      <div className="flex items-start gap-3">
        <span
          className="grid size-11 shrink-0 place-items-center rounded-full bg-accent text-on-accent"
          aria-hidden="true"
        >
          <MailIcon />
        </span>
        <div className="min-w-0">
          <p className="font-display text-2xl text-foreground">{title}</p>
          {email ? (
            <p className="mt-2 text-sm text-secondary">
              Sent to <span className="font-medium break-all text-foreground">{email}</span>
            </p>
          ) : null}
          <p className="mt-2 text-sm leading-relaxed text-secondary">{body}</p>
        </div>
      </div>
    </div>
  );
}

function MailIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 7.5h16v10H4v-10Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path d="M4 8l8 6 8-6" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
