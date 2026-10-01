import Link from "next/link";
import { signInAction } from "@/app/actions/auth";
import AuthFrame, { authTextLinkClass } from "@/components/auth/AuthFrame";
import SignInForm from "@/components/auth/SignInForm";
import { safeNextPath } from "@/lib/auth/access";
import { configErrorFromQuery } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sign in",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const query = await searchParams;
  const next = safeNextPath(query.next);
  const initialError = configErrorFromQuery(query.error);

  return (
    <AuthFrame
      eyebrow="Account"
      title="Sign in"
      description="Email and password. Browsing the map does not need an account."
      footer={
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5">
          <Link href={`/sign-up?next=${encodeURIComponent(next)}`} className={authTextLinkClass}>
            Create an account
          </Link>
          <Link href="/forgot-password" className={authTextLinkClass}>
            Forgot password
          </Link>
        </div>
      }
    >
      <SignInForm action={signInAction} next={next} initialError={initialError} />
    </AuthFrame>
  );
}
