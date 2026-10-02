import Link from "next/link";
import { notFound } from "next/navigation";
import BookingForm from "@/components/BookingForm";
import CategoryBadge from "@/components/CategoryBadge";
import DemoBadge from "@/components/DemoBadge";
import { bookingsOpenForPerformer } from "@/lib/auth/access";
import { getSessionUser } from "@/lib/auth/session";
import { performers } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default async function BookPage({
  params,
}: PageProps<"/performers/[id]/book">) {
  const { id } = await params;
  const performer = await performers.get(id);
  if (!performer) notFound();

  const user = bookingsOpenForPerformer(performer) ? await getSessionUser() : null;

  if (!bookingsOpenForPerformer(performer)) {
    return (
      <main className="mx-auto w-full max-w-lg px-4 py-8 sm:py-14">
        <div className="rounded-2xl border border-line bg-surface p-5 sm:p-8">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">Bookings</p>
          <h1 className="mt-3 font-display text-3xl tracking-tight text-foreground sm:text-4xl">
            Bookings are closed
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-secondary">
            Bookings are closed for this demo profile. These sample artists are not signed in, so
            nobody would see a request.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <DemoBadge />
            <CategoryBadge category={performer.category} />
          </div>
          <p className="mt-4 font-display text-2xl break-words text-foreground">{performer.name}</p>
          <div className="mt-6 flex flex-col gap-3">
            <Link
              href={`/performers/${performer.id}`}
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-accent px-4 text-base font-medium text-on-accent hover:bg-accent-hover"
            >
              View profile
            </Link>
            <Link
              href="/performers"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-surface px-4 text-base font-medium text-foreground hover:bg-surface-hover"
            >
              Browse performers
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-10">
      <p className="text-xs uppercase tracking-[0.2em] text-accent">Private event</p>
      <h1 className="mt-2 font-display text-3xl text-foreground">
        Request {performer.name}
      </h1>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <CategoryBadge category={performer.category} />
      </div>
      <p className="mt-4 text-sm text-muted">
        No payments in v1. A request is saved on your account so you can see when it is accepted,
        declined, or cancelled.
      </p>
      <div className="mt-8">
        {user ? (
          <BookingForm
            performer={{ id: performer.id, name: performer.name }}
            defaultEmail={user.email ?? ""}
          />
        ) : (
          <div className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="font-display text-2xl text-foreground">Sign in to request a booking</h2>
            <p className="mt-3 text-sm leading-relaxed text-secondary">
              Booking requests are tied to your account. Sign in, then send this request.
            </p>
            <Link
              href={`/sign-in?next=${encodeURIComponent(`/performers/${performer.id}/book`)}`}
              className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-accent px-4 text-base font-medium text-on-accent hover:bg-accent-hover"
            >
              Sign in
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
