import Link from "next/link";
import AuthFrame, { authButtonClass, authSecondaryButtonClass } from "@/components/auth/AuthFrame";

export const metadata = {
  title: "Link expired",
};

export default function AuthErrorPage() {
  return (
    <AuthFrame
      eyebrow="Account"
      title="That link did not work"
      description="It may have expired, or it was opened after it had already been used. Request a new one and try again."
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-zinc-700 bg-zinc-950/70 px-4 py-4">
          <span
            className="grid size-11 shrink-0 place-items-center rounded-full bg-accent/15 text-accent ring-1 ring-accent/40"
            aria-hidden="true"
          >
            <ExpiredIcon />
          </span>
          <p className="pt-1 text-sm leading-relaxed text-zinc-300">
            Confirmation and password-reset links are one-time. A new email replaces the old link.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <Link href="/forgot-password" className={authButtonClass}>
            Send a new reset link
          </Link>
          <Link href="/sign-in" className={authSecondaryButtonClass}>
            Sign in
          </Link>
        </div>
      </div>
    </AuthFrame>
  );
}

function ExpiredIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 8v4.5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
