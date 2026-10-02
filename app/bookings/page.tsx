import Link from "next/link";
import BookingRequestCard from "@/components/BookingRequestCard";
import { getSessionUser } from "@/lib/auth/session";
import { bookings, performers } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default async function BookingsPage({
  searchParams,
}: PageProps<"/bookings">) {
  const query = await searchParams;
  const created = typeof query.created === "string" ? query.created : null;
  const user = await getSessionUser();
  const [rows, performerRows, owned] = await Promise.all([
    user ? bookings.listByRequester(user.id) : Promise.resolve([]),
    performers.list(),
    user ? performers.getByUserId(user.id) : Promise.resolve(null),
  ]);
  const names = new Map(performerRows.map((row) => [row.id, row.name]));

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="font-display text-3xl text-foreground">Your requests</h1>
      <p className="mt-2 text-sm text-muted">
        Requests you sent, and where each one stands. You can cancel while it is still pending.
        No payments in v1.
      </p>
      {created ? (
        <p className="mt-4 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-accent">
          Request saved. You can follow it here, and the performer can accept or decline it.
        </p>
      ) : null}
      <div className="mt-8 space-y-3">
        {!user ? (
          <p className="text-sm text-muted">
            <Link href="/sign-in?next=/bookings" className="inline-flex min-h-11 items-center text-accent hover:text-foreground">
              Sign in
            </Link>{" "}
            to see requests you have sent.
          </p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted">You have not sent a request yet.</p>
        ) : (
          rows.map((booking) => (
            <BookingRequestCard
              key={booking.id}
              id={booking.id}
              status={booking.status}
              mode="requester"
              title={names.get(booking.performerId) ?? "Unknown performer"}
              meta={`${booking.preferredDate} · ${booking.preferredLocation}`}
              body={booking.eventDetails}
              note={booking.message || undefined}
            />
          ))
        )}
      </div>
      {owned ? (
        <p className="mt-8 text-sm text-muted">
          <Link href="/account" className="inline-flex min-h-11 items-center text-accent hover:text-foreground">
            Requests for {owned.name}
          </Link>{" "}
          are on your account.
        </p>
      ) : null}
    </main>
  );
}
