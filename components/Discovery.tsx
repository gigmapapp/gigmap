"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import CategoryBadge from "@/components/CategoryBadge";
import { formatGigWhen, localDateKey, startOfLocalDay } from "@/lib/format";
import type { Category, Gig, Performer } from "@/lib/types";

const GigMap = dynamic(() => import("@/components/GigMap"), { ssr: false });

type MappedGig = Gig & { performer: Performer | null };

const FILTERS: Array<{ id: "all" | Category; label: string }> = [
  { id: "all", label: "All" },
  { id: "solo", label: "Solo" },
  { id: "band", label: "Band" },
  { id: "dj", label: "DJ" },
];

export default function Discovery({
  gigs,
  performers,
}: {
  gigs: Gig[];
  performers: Performer[];
}) {
  const byId = useMemo(
    () => new Map(performers.map((performer) => [performer.id, performer])),
    [performers],
  );
  const mapped = useMemo<MappedGig[]>(
    () => gigs.map((gig) => ({ ...gig, performer: byId.get(gig.performerId) ?? null })),
    [byId, gigs],
  );

  const [date, setDate] = useState("");
  const [category, setCategory] = useState<"all" | Category>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const visible = useMemo(() => {
    const start = startOfLocalDay();
    return mapped.filter((gig) => {
      const when = new Date(gig.datetime);
      const upcoming = when >= start;
      const dateOk = date ? localDateKey(gig.datetime) === date : upcoming;
      const categoryOk = category === "all" || gig.category === category;
      return dateOk && categoryOk;
    });
  }, [mapped, date, category]);

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <section className="relative h-[52vh] min-h-[320px] lg:h-auto lg:min-h-0 lg:flex-1">
        <GigMap gigs={visible} selectedId={selectedId} onSelect={setSelectedId} />
        <div className="pointer-events-none absolute inset-x-0 top-0 p-3 sm:p-4">
          <div className="pointer-events-auto mx-auto max-w-xl rounded-2xl border border-zinc-800 bg-zinc-950/85 p-3 shadow-xl backdrop-blur">
            <p className="font-display text-lg tracking-tight text-white">
              Find live music near you.
            </p>
            <p className="mb-3 text-xs text-zinc-400">Austin · upcoming gigs on a free OSM map</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="flex-1 text-xs text-zinc-400">
                Date
                <input
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
                />
              </label>
              <button
                type="button"
                onClick={() => setDate("")}
                className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800 sm:self-end"
              >
                Upcoming
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setCategory(filter.id)}
                  className={`rounded-full px-3 py-1 text-xs ${
                    category === filter.id
                      ? "bg-orange-500 text-white"
                      : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <aside className="flex max-h-[48vh] w-full flex-col border-t border-zinc-800 bg-zinc-950 lg:max-h-none lg:w-[390px] lg:border-l lg:border-t-0">
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="font-display text-lg text-white">
            {date ? `Gigs on ${date}` : "Upcoming gigs"}
          </h2>
          <span className="text-xs text-zinc-500">{visible.length}</span>
        </div>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 pb-6">
          {visible.length === 0 ? (
            <p className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-sm text-zinc-400">
              No gigs match this date. Clear the filter to see everything coming up.
            </p>
          ) : (
            visible.map((gig) => (
              <article
                key={gig.id}
                className={`w-full rounded-xl border p-4 text-left transition ${
                  selectedId === gig.id
                    ? "border-orange-500/70 bg-orange-500/10"
                    : "border-zinc-800 bg-zinc-900/70 hover:border-zinc-600"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setSelectedId(gig.id)}
                  className="w-full text-left"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <CategoryBadge category={gig.category} />
                    <span className="text-xs text-zinc-400">{formatGigWhen(gig.datetime)}</span>
                  </div>
                  <div className="font-medium text-white">{gig.title}</div>
                  <div className="mt-1 text-sm text-zinc-400">{gig.location.label}</div>
                </button>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-orange-300">{gig.performer?.name ?? "Unknown"}</span>
                  <Link
                    href={`/gigs/${gig.id}`}
                    className="text-zinc-300 underline-offset-2 hover:underline"
                  >
                    Details
                  </Link>
                </div>
              </article>
            ))
          )}
        </div>
      </aside>
    </div>
  );
}
