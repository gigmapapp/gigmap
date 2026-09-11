import Link from "next/link";
import { getSessionPerformer } from "@/lib/auth";
import { bookings, performers } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default async function BookingsPage({
  searchParams,
}: PageProps<"/bookings">) {
  const query = await searchParams;
  const created = typeof query.created === "string" ? query.created : null;
  const session = await getSessionPerformer();
  const [rows, performerRows] = await Promise.all([
    bookings.list(),
    performers.list(),
  ]);
  const names = new Map(performerRows.map((row) => [row.id, row.name]));

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="font-display text-3xl text-white">Booking requests</h1>
      <p className="mt-2 text-sm text-zinc-400">
        Stored locally. No payments, inbox thread, or accept/decline workflow in v1.
      </p>
      {created ? (
        <p className="mt-4 rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-sm text-orange-100">
          Request saved. The performer can see it here.
        </p>
      ) : null}
      <div className="mt-8 space-y-3">
        {rows.length === 0 ? (
          <p className="text-sm text-zinc-500">No requests yet.</p>
        ) : (
          rows.map((booking) => (
            <article
              key={booking.id}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5"
            >
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="uppercase tracking-wide text-orange-300">
                  {booking.status}
                </span>
                {session?.id === booking.performerId ? (
                  <span className="text-zinc-500">For you</span>
                ) : null}
              </div>
              <h2 className="mt-2 font-medium text-white">
                <Link
                  href={`/performers/${booking.performerId}`}
                  className="hover:text-orange-300"
                >
                  {names.get(booking.performerId) ?? "Unknown performer"}
                </Link>
              </h2>
              <p className="mt-1 text-sm text-zinc-400">
                {booking.preferredDate} · {booking.preferredLocation}
              </p>
              <p className="mt-3 text-sm text-zinc-200">{booking.eventDetails}</p>
              {booking.message ? (
                <p className="mt-2 text-sm text-zinc-400">{booking.message}</p>
              ) : null}
              <p className="mt-3 text-xs text-zinc-500">
                {booking.contactName} · {booking.contactEmail}
              </p>
            </article>
          ))
        )}
      </div>
    </main>
  );
}
