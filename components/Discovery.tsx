"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import CategoryBadge from "@/components/CategoryBadge";
import { formatGigWhen, gigMatchesVenueDate, localDateKey } from "@/lib/format";
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

  const dateChips = useMemo(() => {
    const keys = new Set<string>();
    for (const gig of mapped) {
      keys.add(localDateKey(gig.datetime, gig.timezone));
    }
    return [...keys].sort().slice(0, 6);
  }, [mapped]);

  const visible = useMemo(() => {
    return mapped.filter((gig) => {
      const dateOk = gigMatchesVenueDate(gig.datetime, date, new Date(), gig.timezone);
      const categoryOk = category === "all" || gig.category === category;
      return dateOk && categoryOk;
    });
  }, [mapped, date, category]);

  return (
    <div className="flex w-full min-w-0 flex-col md:min-h-0 md:flex-1 md:flex-row md:overflow-hidden">
      <section className="relative w-full min-w-0 md:h-full md:min-h-0 md:flex-1">
        <MobileFilterBar
          date={date}
          dateChips={dateChips}
          category={category}
          onDate={setDate}
          onCategory={setCategory}
        />
        <div className="relative h-[40vh] min-h-[220px] w-full min-w-0 md:absolute md:inset-0 md:h-auto md:min-h-0">
          <GigMap gigs={visible} selectedId={selectedId} onSelect={setSelectedId} />
          <div className="pointer-events-none absolute inset-x-0 top-0 hidden p-3 sm:p-4 md:block">
            <div className="pointer-events-none mx-auto max-w-xl rounded-2xl border border-zinc-800 bg-zinc-950/85 p-3 shadow-xl backdrop-blur">
              <p className="font-display text-lg tracking-tight text-white">
                Find live music near you.
              </p>
              <p className="mb-3 text-xs text-zinc-400">
                Austin · dates in Central Time · OpenStreetMap tiles
              </p>
              <div className="pointer-events-auto flex flex-col gap-2 sm:flex-row">
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
              <div className="pointer-events-auto mt-2 flex flex-wrap gap-1.5">
                {dateChips.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setDate(chip)}
                    className={`rounded-full px-2.5 py-1 text-xs ${
                      date === chip
                        ? "bg-white text-zinc-950"
                        : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                    }`}
                  >
                    {chip}
                  </button>
                ))}
              </div>
              <div className="pointer-events-auto mt-2 flex flex-wrap gap-1.5">
                {FILTERS.map((filter) => (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => setCategory(filter.id)}
                    className={`rounded-full px-3 py-1 text-xs ${
                      category === filter.id
                        ? "bg-accent text-zinc-950"
                        : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <aside className="flex max-h-[48vh] w-full min-w-0 flex-col border-t border-zinc-800 bg-zinc-950 md:h-full md:max-h-none md:min-h-0 md:w-[390px] md:overflow-hidden md:border-l md:border-t-0">
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
                    ? "border-accent/70 bg-accent/10"
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
                    <span className="text-xs text-zinc-400">{formatGigWhen(gig.datetime, gig.timezone)}</span>
                  </div>
                  <div className="font-medium text-white">{gig.title}</div>
                  <div className="mt-1 text-sm text-zinc-400">{gig.location.label}</div>
                </button>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-accent">{gig.performer?.name ?? "Unknown"}</span>
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

/** Calendar label for a venue date key, e.g. 2026-09-30 → "Wed 30". */
function shortDateChip(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const parts = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    day: "numeric",
    timeZone: "UTC",
  }).formatToParts(new Date(Date.UTC(year, month - 1, day)));
  const weekday = parts.find((part) => part.type === "weekday")?.value ?? "";
  const dayPart = parts.find((part) => part.type === "day")?.value ?? String(day);
  return `${weekday} ${dayPart}`;
}

function MobileFilterBar({
  date,
  dateChips,
  category,
  onDate,
  onCategory,
}: {
  date: string;
  dateChips: string[];
  category: "all" | Category;
  onDate: (date: string) => void;
  onCategory: (category: "all" | Category) => void;
}) {
  return (
    <div className="w-full min-w-0 shrink-0 overflow-hidden border-b border-zinc-800 bg-zinc-950 md:hidden">
      <p className="truncate px-3 pt-2 text-sm text-zinc-300">Find live music near you</p>
      <div className="flex items-center gap-2 px-3 pt-2">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Date</span>
          <input
            type="date"
            value={date}
            aria-label="Date"
            onChange={(event) => onDate(event.target.value)}
            className="h-11 w-full min-w-0 max-w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-white"
          />
        </label>
        <button
          type="button"
          onClick={() => onDate("")}
          className="h-11 shrink-0 rounded-lg border border-zinc-700 px-3 text-sm text-zinc-200 hover:bg-zinc-800"
        >
          Upcoming
        </button>
      </div>
      <div className="flex gap-2 px-3 pt-2">
        {FILTERS.map((filter) => (
          <button
            key={filter.id}
            type="button"
            onClick={() => onCategory(filter.id)}
            className={`h-11 min-w-11 flex-1 rounded-full px-2 text-sm whitespace-nowrap ${
              category === filter.id
                ? "bg-accent text-zinc-950"
                : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>
      {dateChips.length > 0 ? (
        <div className="max-w-full overflow-x-auto px-3 pt-2 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max items-center gap-2">
            {dateChips.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => onDate(chip)}
                aria-label={chip}
                className={`h-11 min-w-11 shrink-0 rounded-full px-3 text-sm ${
                  date === chip
                    ? "bg-white text-zinc-950"
                    : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                }`}
              >
                {shortDateChip(chip)}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="pb-2" />
      )}
    </div>
  );
}
