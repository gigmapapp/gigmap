import Link from "next/link";
import { notFound } from "next/navigation";
import BookPerformerLink from "@/components/BookPerformerLink";
import CategoryBadge from "@/components/CategoryBadge";
import DemoBadge from "@/components/DemoBadge";
import GigSource from "@/components/GigSource";
import { formatGigDay, formatGigWhen, zoneForGig } from "@/lib/format";
import { gigDisplayTitle } from "@/lib/gig-display";
import { gigs, performers } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default async function GigPage({ params }: PageProps<"/gigs/[id]">) {
  const { id } = await params;
  const gig = await gigs.get(id);
  if (!gig) notFound();
  const performer = await performers.get(gig.performerId);
  const description = gig.description.trim();
  const display = gigDisplayTitle(gig.title, performer?.name);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <CategoryBadge category={gig.category} />
      <h1 className="mt-3 font-display text-4xl break-words text-white">{display.primary || "Unknown"}</h1>
      <p className="mt-3 text-zinc-300">{formatGigDay(gig.datetime, zoneForGig(gig))}</p>
      <p className="text-zinc-400">{formatGigWhen(gig.datetime, zoneForGig(gig))}</p>
      <p className="mt-4 break-words text-lg text-white">{gig.location.label}</p>
      <p className="mt-1 text-xs text-zinc-500">
        {gig.location.lat.toFixed(5)}, {gig.location.lng.toFixed(5)}
      </p>
      <GigSource sourceUrl={gig.sourceUrl} sourceKind={gig.sourceKind} className="mt-4" />
      {description ? <p className="mt-6 break-words text-zinc-300">{description}</p> : null}

      {performer ? (
        <section className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Performer</p>
          {display.secondary !== null ? (
            <Link
              href={`/performers/${performer.id}`}
              className="mt-1 block font-display text-2xl text-white hover:text-accent"
            >
              {performer.name}
            </Link>
          ) : null}
          {performer.claimed ? null : (
            <div className="mt-2">
              <DemoBadge />
            </div>
          )}
          {performer.bio.trim() ? (
            <p className="mt-2 text-sm text-zinc-400">{performer.bio}</p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={`/performers/${performer.id}`}
              className="inline-flex min-h-11 items-center rounded-lg bg-zinc-800 px-4 py-2 text-sm text-white hover:bg-zinc-700"
            >
              Profile & clips
            </Link>
            <BookPerformerLink performer={performer} />
          </div>
        </section>
      ) : null}

      <p className="mt-8">
        <Link href="/" className="text-sm text-accent hover:underline">
          ← Back to map
        </Link>
      </p>
    </main>
  );
}
