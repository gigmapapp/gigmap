import Link from "next/link";
import { updatePasswordAction } from "@/app/actions/auth";
import AuthFrame from "@/components/auth/AuthFrame";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";
import { getSessionUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

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
        <Link href="/forgot-password" className="text-accent hover:underline">
          Send another reset link
        </Link>
      }
    >
      {user ? <ResetPasswordForm action={updatePasswordAction} /> : null}
    </AuthFrame>
  );
}
