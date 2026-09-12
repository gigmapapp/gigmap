import Link from "next/link";
import { notFound } from "next/navigation";
import CategoryBadge from "@/components/CategoryBadge";
import { formatGigDay, formatGigWhen } from "@/lib/format";
import { gigs, performers } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default async function GigPage({ params }: PageProps<"/gigs/[id]">) {
  const { id } = await params;
  const gig = await gigs.get(id);
  if (!gig) notFound();
  const performer = await performers.get(gig.performerId);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <CategoryBadge category={gig.category} />
      <h1 className="mt-3 font-display text-4xl text-white">{gig.title}</h1>
      <p className="mt-3 text-zinc-300">{formatGigDay(gig.datetime)}</p>
      <p className="text-zinc-400">{formatGigWhen(gig.datetime)}</p>
      <p className="mt-4 text-lg text-white">{gig.location.label}</p>
      <p className="mt-1 text-xs text-zinc-500">
        {gig.location.lat.toFixed(5)}, {gig.location.lng.toFixed(5)}
      </p>
      {gig.description ? (
        <p className="mt-6 text-zinc-300">{gig.description}</p>
      ) : null}

      {performer ? (
        <section className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Performer</p>
          <Link
            href={`/performers/${performer.id}`}
            className="mt-1 block font-display text-2xl text-white hover:text-orange-300"
          >
            {performer.name}
          </Link>
          <p className="mt-2 text-sm text-zinc-400">{performer.bio}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={`/performers/${performer.id}`}
              className="rounded-lg bg-zinc-800 px-4 py-2 text-sm text-white hover:bg-zinc-700"
            >
              Profile & clips
            </Link>
            <Link
              href={`/performers/${performer.id}/book`}
              className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
            >
              Request to book
            </Link>
          </div>
        </section>
      ) : null}

      <p className="mt-8">
        <Link href="/" className="text-sm text-orange-300 hover:underline">
          ← Back to map
        </Link>
      </p>
    </main>
  );
}
