import Link from "next/link";
import { notFound } from "next/navigation";
import AddVideoForm from "@/components/AddVideoForm";
import BookPerformerLink from "@/components/BookPerformerLink";
import CategoryBadge from "@/components/CategoryBadge";
import DemoBadge from "@/components/DemoBadge";
import GigSource from "@/components/GigSource";
import VideoEmbed from "@/components/VideoEmbed";
import { getSessionPerformer } from "@/lib/auth/session";
import { formatGigWhen, isUpcoming, zoneForGig } from "@/lib/format";
import { gigDisplayTitle } from "@/lib/gig-display";
import { clipUploadMode, gigs, performers } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default async function PerformerPage({
  params,
}: PageProps<"/performers/[id]">) {
  const { id } = await params;
  const performer = await performers.get(id);
  if (!performer) notFound();

  const session = await getSessionPerformer();
  const own = session?.id === performer.id;
  const upcoming = (await gigs.list()).filter(
    (gig) => gig.performerId === performer.id && isUpcoming(gig.datetime),
  );
  const place = [performer.city, ...performer.genres].map((part) => part.trim()).filter(Boolean);

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <CategoryBadge category={performer.category} />
            {performer.claimed ? null : <DemoBadge />}
          </div>
          <h1 className="mt-3 font-display text-4xl break-words text-foreground">{performer.name}</h1>
          {place.length > 0 ? (
            <p className="mt-2 text-sm break-words text-muted">{place.join(" · ")}</p>
          ) : null}
        </div>
        <BookPerformerLink performer={performer} />
      </div>
      {performer.bio.trim() ? (
        <p className="mt-6 max-w-2xl text-secondary">{performer.bio}</p>
      ) : null}

      <section className="mt-10">
        <h2 className="font-display text-2xl text-foreground">Clips</h2>
        {performer.videos.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-line bg-surface px-4 py-8 text-center">
            <p className="text-sm font-medium text-secondary">No clips yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
              Videos will show up here when this performer adds them.
            </p>
          </div>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {performer.videos.map((video) => (
              <figure key={video.id} className="space-y-2">
                <VideoEmbed url={video.url} title={video.title} />
                <figcaption className="text-sm text-muted">{video.title}</figcaption>
              </figure>
            ))}
          </div>
        )}
        {own ? (
          <div className="mt-6">
            <AddVideoForm performerId={performer.id} uploadMode={clipUploadMode()} />
          </div>
        ) : null}
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl text-foreground">Upcoming gigs</h2>
        <div className="mt-4 space-y-3">
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted">Nothing on the calendar yet.</p>
          ) : (
            upcoming.map((gig) => (
              <article
                key={gig.id}
                className="min-w-0 rounded-xl border border-line bg-surface px-4 py-3 hover:border-accent/40"
              >
                <Link href={`/gigs/${gig.id}`} className="block min-h-11 rounded-lg py-1">
                  <div className="font-medium break-words text-foreground">
                    {gigDisplayTitle(gig.title, performer.name).primary || "Unknown"}
                  </div>
                  <div className="mt-1 text-sm break-words text-muted">
                    {formatGigWhen(gig.datetime, zoneForGig(gig))} · {gig.location.label}
                  </div>
                </Link>
                <GigSource sourceUrl={gig.sourceUrl} sourceKind={gig.sourceKind} className="mt-1" />
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
