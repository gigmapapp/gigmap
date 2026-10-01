import Link from "next/link";
import { updatePasswordAction } from "@/app/actions/auth";
import AuthFrame, { authButtonClass, authTextLinkClass } from "@/components/auth/AuthFrame";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";
import { getSessionUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Choose a new password",
};

export default async function ResetPasswordPage() {
  const user = await getSessionUser();

  return (
    <AuthFrame
      eyebrow="Account"
      title="Choose a new password"
      description={
        user
          ? "This replaces the password on your account."
          : "Open the reset link from your email first. That link signs you in long enough to set a new password."
      }
      footer={
        user ? (
          <Link href="/forgot-password" className={authTextLinkClass}>
            Send another reset link
          </Link>
        ) : null
      }
    >
      {user ? (
        <ResetPasswordForm action={updatePasswordAction} />
      ) : (
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-zinc-300">
            This page stays blank until that link is opened. An expired or used link will not sign you in.
          </p>
          <Link href="/forgot-password" className={authButtonClass}>
            Email me a reset link
          </Link>
        </div>
      )}
    </AuthFrame>
  );
}
