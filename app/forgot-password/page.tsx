import Link from "next/link";
import { forgotPasswordAction } from "@/app/actions/auth";
import AuthFrame, { authTextLinkClass } from "@/components/auth/AuthFrame";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Forgot password",
};

export default function ForgotPasswordPage() {
  return (
    <AuthFrame
      eyebrow="Account"
      title="Forgot password"
      description="We will email a link that lets you choose a new password."
      footer={
        <Link href="/sign-in" className={authTextLinkClass}>
          Back to sign in
        </Link>
      }
    >
      <ForgotPasswordForm action={forgotPasswordAction} />
    </AuthFrame>
  );
}
