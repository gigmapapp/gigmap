import Link from "next/link";
import { notFound } from "next/navigation";
import AddVideoForm from "@/components/AddVideoForm";
import CategoryBadge from "@/components/CategoryBadge";
import VideoEmbed from "@/components/VideoEmbed";
import { getSessionPerformer } from "@/lib/auth";
import { formatGigWhen } from "@/lib/format";
import { gigs, performers } from "@/lib/repo";

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
    (gig) => gig.performerId === performer.id && new Date(gig.datetime) >= new Date(),
  );

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CategoryBadge category={performer.category} />
          <h1 className="mt-3 font-display text-4xl text-white">{performer.name}</h1>
          <p className="mt-2 text-sm text-zinc-400">
            {performer.city} · {performer.genres.join(" · ")}
          </p>
        </div>
        <Link
          href={`/performers/${performer.id}/book`}
          className="rounded-lg bg-orange-500 px-4 py-2 text-center text-sm font-medium text-white hover:bg-orange-600"
        >
          Request to book
        </Link>
      </div>
      <p className="mt-6 max-w-2xl text-zinc-300">{performer.bio}</p>

      <section className="mt-10">
        <h2 className="font-display text-2xl text-white">Clips</h2>
        {performer.videos.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">No clips yet.</p>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {performer.videos.map((video) => (
              <figure key={video.id} className="space-y-2">
                <VideoEmbed url={video.url} title={video.title} />
                <figcaption className="text-sm text-zinc-400">{video.title}</figcaption>
              </figure>
            ))}
          </div>
        )}
        {own ? <div className="mt-6"><AddVideoForm performerId={performer.id} /></div> : null}
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl text-white">Upcoming gigs</h2>
        <div className="mt-4 space-y-3">
          {upcoming.length === 0 ? (
            <p className="text-sm text-zinc-500">Nothing on the calendar yet.</p>
          ) : (
            upcoming.map((gig) => (
              <Link
                key={gig.id}
                href={`/gigs/${gig.id}`}
                className="block rounded-xl border border-zinc-800 bg-zinc-900/70 p-4 hover:border-orange-500/40"
              >
                <div className="font-medium text-white">{gig.title}</div>
                <div className="mt-1 text-sm text-zinc-400">
                  {formatGigWhen(gig.datetime)} · {gig.location.label}
                </div>
              </Link>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
