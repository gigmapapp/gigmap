import Link from "next/link";
import { signUpAction } from "@/app/actions/auth";
import AuthFrame, { authTextLinkClass } from "@/components/auth/AuthFrame";
import SignUpForm from "@/components/auth/SignUpForm";
import { safeNextPath } from "@/lib/auth/access";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Create an account",
};

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const query = await searchParams;
  const next = safeNextPath(query.next, "/account");

  return (
    <AuthFrame
      eyebrow="Account"
      title="Create an account"
      description="We email you a confirmation link before you can post gigs or add clips."
      footer={
        <Link href={`/sign-in?next=${encodeURIComponent(next)}`} className={authTextLinkClass}>
          Already have an account? Sign in
        </Link>
      }
    >
      <SignUpForm action={signUpAction} />
    </AuthFrame>
  );
}
