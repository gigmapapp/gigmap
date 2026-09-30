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

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-10">
      <p className="text-xs uppercase tracking-[0.2em] text-accent">Private event</p>
      <h1 className="mt-2 font-display text-3xl text-white">
        Request {performer.name}
      </h1>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <CategoryBadge category={performer.category} />
        {performer.claimed ? null : <DemoBadge />}
      </div>
      {bookingsOpenForPerformer(performer) ? (
        <>
          <p className="mt-4 text-sm text-zinc-400">
            No payments in v1 — this stores a booking request the performer can read when they
            are signed in. You do not need an account to send it.
          </p>
          <div className="mt-8">
            <BookingForm performer={{ id: performer.id, name: performer.name }} />
          </div>
        </>
      ) : (
        <div className="mt-6 space-y-3 text-sm text-zinc-400">
          <p>This is a demo profile. Booking requests are closed because nobody can read them.</p>
          <Link href={`/performers/${performer.id}`} className="text-accent hover:underline">
            Back to profile
          </Link>
        </div>
      )}
    </main>
  );
}
