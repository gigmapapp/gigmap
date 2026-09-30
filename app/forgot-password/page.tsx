import Link from "next/link";
import { forgotPasswordAction } from "@/app/actions/auth";
import AuthFrame from "@/components/auth/AuthFrame";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  return (
    <AuthFrame
      eyebrow="Account"
      title="Reset password"
      description="We will email a link that lets you choose a new password."
      footer={
        <Link href="/sign-in" className="text-accent hover:underline">
          Back to sign in
        </Link>
      }
    >
      <ForgotPasswordForm action={forgotPasswordAction} />
    </AuthFrame>
  );
}
