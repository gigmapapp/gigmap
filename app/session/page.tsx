import { pickPerformerAction } from "@/app/actions/session";
import CategoryBadge from "@/components/CategoryBadge";
import { performers } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default async function SessionPage({
  searchParams,
}: PageProps<"/session">) {
  const query = await searchParams;
  const next = typeof query.next === "string" ? query.next : "/";
  const rows = await performers.list();

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <p className="text-xs uppercase tracking-[0.2em] text-orange-400">Temporary auth</p>
      <h1 className="mt-2 font-display text-3xl text-white">Act as a performer</h1>
      <p className="mt-2 max-w-xl text-sm text-zinc-400">
        v1 uses a cookie, not real accounts. Pick a seeded Austin artist to post gigs and
        upload clips. Fans can browse and request bookings without this step.
      </p>
      <div className="mt-8 grid gap-3">
        {rows.map((performer) => (
          <form
            key={performer.id}
            action={pickPerformerAction}
            className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4"
          >
            <input type="hidden" name="performerId" value={performer.id} />
            <input type="hidden" name="next" value={next} />
            <div>
              <div className="font-medium text-white">{performer.name}</div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                <CategoryBadge category={performer.category} />
                <span>{performer.genres.join(" · ")}</span>
              </div>
            </div>
            <button
              type="submit"
              className="shrink-0 rounded-lg bg-orange-500 px-3 py-2 text-sm font-medium text-white hover:bg-orange-600"
            >
              Use
            </button>
          </form>
        ))}
      </div>
      <p className="mt-8 text-sm text-zinc-400">
        Need a new profile?{" "}
        <a href="/performers/new" className="text-orange-300 underline-offset-2 hover:underline">
          Create a performer
        </a>
      </p>
    </main>
  );
}
