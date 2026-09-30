import Link from "next/link";
import AuthFrame from "@/components/auth/AuthFrame";

export default function AuthErrorPage() {
  return (
    <AuthFrame
      eyebrow="Account"
      title="That link did not work"
      description="It may have expired, or it was opened after it had already been used. Request a new one and try again."
      footer={
        <>
          <Link href="/sign-in" className="text-accent hover:underline">
            Sign in
          </Link>
          <span className="mx-2 text-zinc-600">·</span>
          <Link href="/forgot-password" className="text-accent hover:underline">
            Reset password
          </Link>
        </>
      }
    >
      <p className="text-sm text-zinc-400">
        Confirmation and password-reset links are one-time. A new email replaces the old link.
      </p>
    </AuthFrame>
  );
}
