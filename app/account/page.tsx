import Link from "next/link";
import { signOutAction } from "@/app/actions/auth";
import { createProfileAction, updateProfileAction } from "@/app/actions/account";
import AuthFrame, { authButtonClass, authSecondaryButtonClass } from "@/components/auth/AuthFrame";
import ProfileForm from "@/components/auth/ProfileForm";
import CategoryBadge from "@/components/CategoryBadge";
import { safeNextPath } from "@/lib/auth/access";
import { requireUser } from "@/lib/auth/session";
import { performers } from "@/lib/repo";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Account",
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; edit?: string }>;
}) {
  const query = await searchParams;
  const user = await requireUser("/account");
  const next = safeNextPath(query.next, "/account");
  const performer = await performers.getByUserId(user.id);
  const editing = query.edit === "1";

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

  const genres = performer.genres.length > 0 ? performer.genres.join(", ") : "No genres yet";

  return (
    <AuthFrame eyebrow="Account" title={performer.name} description={user.email ?? "Signed in"}>
      {editing ? (
        <ProfileForm
          action={updateProfileAction}
          next="/account"
          submitLabel="Save changes"
          defaults={{
            name: performer.name,
            category: performer.category,
            bio: performer.bio,
            city: performer.city,
            genres: performer.genres.join(", "),
          }}
        />
      ) : (
        <dl className="space-y-4">
        <div>
          <dt className="text-sm text-zinc-500">Category</dt>
          <dd className="mt-1.5">
            <CategoryBadge category={performer.category} />
          </dd>
        </div>
        <div>
          <dt className="text-sm text-zinc-500">City</dt>
          <dd className="mt-1 text-base break-words text-white">{performer.city}</dd>
        </div>
        <div>
          <dt className="text-sm text-zinc-500">Genres</dt>
          <dd className="mt-1 text-base break-words text-white">{genres}</dd>
        </div>
        <div>
          <dt className="text-sm text-zinc-500">Bio</dt>
          <dd className="mt-1 text-base leading-relaxed break-words text-zinc-200">
            {performer.bio || "No bio yet."}
          </dd>
        </div>
        </dl>
      )}
      <div className="mt-6 flex flex-col gap-3">
        {editing ? (
          <Link href="/account" className={authSecondaryButtonClass}>
            Cancel
          </Link>
        ) : (
          <Link href="/account?edit=1" className={authSecondaryButtonClass}>
            Edit profile
          </Link>
        )}
        <Link href={`/performers/${performer.id}`} className={authButtonClass}>
          View profile
        </Link>
        <Link href="/gigs/new" className={authSecondaryButtonClass}>
          Post a gig
        </Link>
        <Link
          href="/bookings"
          className="inline-flex min-h-11 items-center justify-center rounded-lg px-4 text-base text-zinc-300 hover:bg-zinc-800 hover:text-white"
        >
          Booking requests
        </Link>
        <form action={signOutAction}>
          <button
            type="submit"
            className="inline-flex min-h-11 w-full items-center justify-center rounded-lg px-4 text-base text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            Sign out
          </button>
        </form>
      </div>
    </AuthFrame>
  );
}
