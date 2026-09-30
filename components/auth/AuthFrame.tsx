import type { ReactNode } from "react";

/** Shared shell for sign-in, sign-up, and account screens. Restyle this file first. */
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
    <main className="mx-auto w-full max-w-xl px-4 py-10">
      <p className="text-xs uppercase tracking-[0.2em] text-accent">{eyebrow}</p>
      <h1 className="mt-2 font-display text-3xl text-white">{title}</h1>
      {description ? <p className="mt-2 text-sm text-zinc-400">{description}</p> : null}
      <div className="mt-8">{children}</div>
      {footer ? <div className="mt-6 text-sm text-zinc-400">{footer}</div> : null}
    </main>
  );
}

export const authFieldClass =
  "mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white";

export const authButtonClass =
  "w-full rounded-lg bg-accent py-3 font-medium text-zinc-950 hover:bg-accent-hover disabled:opacity-60";

export function AuthStatus({ error, message }: { error: string | null; message: string | null }) {
  if (error) {
    return (
      <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200" role="alert">
        {error}
      </p>
    );
  }
  if (message) {
    return (
      <p className="rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-accent" role="status">
        {message}
      </p>
    );
  }
  return null;
}
