import { notFound } from "next/navigation";
import BookingForm from "@/components/BookingForm";
import CategoryBadge from "@/components/CategoryBadge";
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
      <p className="text-xs uppercase tracking-[0.2em] text-orange-400">Private event</p>
      <h1 className="mt-2 font-display text-3xl text-white">
        Request {performer.name}
      </h1>
      <div className="mt-3">
        <CategoryBadge category={performer.category} />
      </div>
      <p className="mt-4 text-sm text-zinc-400">
        No payments in v1 — this stores a booking request the performer can read on the
        Bookings page.
      </p>
      <div className="mt-8">
        <BookingForm performer={performer} />
      </div>
    </main>
  );
}
