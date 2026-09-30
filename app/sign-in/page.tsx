import Link from "next/link";
import { signInAction } from "@/app/actions/auth";
import AuthFrame from "@/components/auth/AuthFrame";
import SignInForm from "@/components/auth/SignInForm";
import { safeNextPath } from "@/lib/auth/access";
import { configErrorFromQuery } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

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
        <>
          <Link href={`/sign-up?next=${encodeURIComponent(next)}`} className="text-accent hover:underline">
            Create an account
          </Link>
          <span className="mx-2 text-zinc-600">·</span>
          <Link href="/forgot-password" className="text-accent hover:underline">
            Forgot password
          </Link>
        </>
      }
    >
      <SignInForm action={signInAction} next={next} initialError={initialError} />
    </AuthFrame>
  );
}
