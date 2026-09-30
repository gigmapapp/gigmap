import Link from "next/link";
import { signOutAction } from "@/app/actions/auth";
import { createProfileAction } from "@/app/actions/account";
import AuthFrame from "@/components/auth/AuthFrame";
import ProfileForm from "@/components/auth/ProfileForm";
import CategoryBadge from "@/components/CategoryBadge";
import { safeNextPath } from "@/lib/auth/access";
import { requireUser } from "@/lib/auth/session";
import { performers } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const query = await searchParams;
  const user = await requireUser("/account");
  const next = safeNextPath(query.next, "/account");
  const performer = await performers.getByUserId(user.id);

  if (!performer) {
    return (
      <AuthFrame
        eyebrow="Account"
        title="Create your profile"
        description="One performer profile per account. This is the profile you post gigs and clips for."
      >
        <ProfileForm action={createProfileAction} next={next} />
      </AuthFrame>
    );
  }

  return (
    <AuthFrame
      eyebrow="Account"
      title={performer.name}
      description={user.email ?? "Signed in"}
      footer={
        <form action={signOutAction}>
          <button type="submit" className="text-zinc-400 hover:text-white">
            Sign out
          </button>
        </form>
      }
    >
      <div className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
        <CategoryBadge category={performer.category} />
        <p className="text-sm text-zinc-300">{performer.bio || "No bio yet."}</p>
        <p className="text-sm text-zinc-500">
          {performer.city}
          {performer.genres.length > 0 ? ` · ${performer.genres.join(" · ")}` : ""}
        </p>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link
            href={`/performers/${performer.id}`}
            className="rounded-lg bg-zinc-800 px-3 py-2 text-white hover:bg-zinc-700"
          >
            View profile
          </Link>
          <Link
            href="/gigs/new"
            className="rounded-lg bg-accent px-3 py-2 font-medium text-zinc-950 hover:bg-accent-hover"
          >
            Post a gig
          </Link>
          <Link href="/bookings" className="rounded-lg px-3 py-2 text-zinc-300 hover:bg-zinc-800">
            Booking requests
          </Link>
        </div>
      </div>
    </AuthFrame>
  );
}
