import Link from "next/link";
import { notFound } from "next/navigation";
import BookingForm from "@/components/BookingForm";
import CategoryBadge from "@/components/CategoryBadge";
import DemoBadge from "@/components/DemoBadge";
import { bookingsOpenForPerformer } from "@/lib/auth/access";
import { performers } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default async function BookPage({
  params,
}: PageProps<"/performers/[id]/book">) {
  const { id } = await params;
  const performer = await performers.get(id);
  if (!performer) notFound();

  if (!bookingsOpenForPerformer(performer)) {
    return (
      <main className="mx-auto w-full max-w-lg px-4 py-8 sm:py-14">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 sm:p-8">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">Bookings</p>
          <h1 className="mt-3 font-display text-3xl tracking-tight text-white sm:text-4xl">
            Bookings are closed
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-300">
            Bookings are closed for this demo profile. These sample artists are not signed in, so
            nobody would see a request.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <DemoBadge />
            <CategoryBadge category={performer.category} />
          </div>
          <p className="mt-4 font-display text-2xl break-words text-white">{performer.name}</p>
          <div className="mt-6 flex flex-col gap-3">
            <Link
              href={`/performers/${performer.id}`}
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-accent px-4 text-base font-medium text-zinc-950 hover:bg-accent-hover"
            >
              View profile
            </Link>
            <Link
              href="/performers"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-zinc-800 px-4 text-base font-medium text-white hover:bg-zinc-700"
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
      <h1 className="mt-2 font-display text-3xl text-white">
        Request {performer.name}
      </h1>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <CategoryBadge category={performer.category} />
      </div>
      <p className="mt-4 text-sm text-zinc-400">
        No payments in v1 — this stores a booking request the performer can read when they
        are signed in. You do not need an account to send it.
      </p>
      <div className="mt-8">
        <BookingForm performer={{ id: performer.id, name: performer.name }} />
      </div>
    </main>
  );
}
