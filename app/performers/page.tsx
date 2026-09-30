import Link from "next/link";
import CategoryBadge from "@/components/CategoryBadge";
import DemoBadge from "@/components/DemoBadge";
import { performers } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default async function PerformersPage() {
  const rows = await performers.list();

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-accent">Roster</p>
          <h1 className="mt-2 font-display text-3xl text-white">Performers</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Solo artists, bands, and DJs posting in Austin.
          </p>
        </div>
        <Link
          href="/account"
          className="rounded-lg bg-zinc-800 px-4 py-2 text-sm text-white hover:bg-zinc-700"
        >
          Your profile
        </Link>
      </div>
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {rows.map((performer) => (
          <Link
            key={performer.id}
            href={`/performers/${performer.id}`}
            className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 hover:border-accent/40"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-display text-xl text-white">{performer.name}</h2>
              <span className="flex items-center gap-2">
                {performer.claimed ? null : <DemoBadge />}
                <CategoryBadge category={performer.category} />
              </span>
            </div>
            <p className="mt-2 line-clamp-2 text-sm text-zinc-400">{performer.bio}</p>
            <p className="mt-3 text-xs text-zinc-500">
              {performer.city} · {performer.genres.join(" · ")} · {performer.videos.length} clips
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}
