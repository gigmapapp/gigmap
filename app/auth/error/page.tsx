import Link from "next/link";
import AuthErrorHash from "@/components/auth/AuthErrorHash";
import AuthFrame, { authButtonClass, authSecondaryButtonClass } from "@/components/auth/AuthFrame";
import { authLinkFailureFromParams, presentAuthLinkError } from "@/lib/auth/link";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Link did not work",
};

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; error_code?: string; error_description?: string }>;
}) {
  const query = await searchParams;
  const presented = presentAuthLinkError(
    classifyPageCode(query.error_code, query.error, query.error_description),
  );

  return (
    <AuthFrame eyebrow="Account" title={presented.title} description={presented.message}>
      <AuthErrorHash />
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

function classifyPageCode(
  errorCode: string | undefined,
  error: string | undefined,
  errorDescription: string | undefined,
): string | null {
  const params = new URLSearchParams();
  if (error) params.set("error", error);
  if (errorCode) params.set("error_code", errorCode);
  if (errorDescription) params.set("error_description", errorDescription);
  return authLinkFailureFromParams(params)?.errorCode ?? null;
}

function ExpiredIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 8v4.5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
