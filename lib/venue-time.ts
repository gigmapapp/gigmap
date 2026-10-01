/**
 * Default IANA zone when a gig has no `timezone`.
 * The launch area is Mystic, CT. Pass a per-gig zone when one is present.
 * New York is UTC−04:00 in summer (EDT) and UTC−05:00 in winter (EST).
 */
export const VENUE_TIME_ZONE = "America/New_York";

type WallParts = {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
  second: string;
};

/** Use a gig's IANA zone when it is valid. Otherwise the launch default. */
export function resolveTimeZone(timeZone?: string | null): string {
  if (typeof timeZone !== "string") return VENUE_TIME_ZONE;
  const trimmed = timeZone.trim();
  if (!trimmed) return VENUE_TIME_ZONE;
  try {
    Intl.DateTimeFormat("en-US", { timeZone: trimmed }).format(0);
    return trimmed;
  } catch {
    return VENUE_TIME_ZONE;
  }
}

function zonedInstant(instant: string | Date): Date {
  const date = typeof instant === "string" ? new Date(instant) : instant;
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function timeZoneName(
  timeZone: string | null | undefined,
  instant: string | Date,
  name: "shortGeneric" | "longGeneric",
): string {
  const zone = resolveTimeZone(timeZone);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    timeZoneName: name,
  }).formatToParts(zonedInstant(instant));
  return parts.find((part) => part.type === "timeZoneName")?.value ?? zone;
}

/** Short generic label, stable across DST: ET, CT, MT, PT. */
export function venueZoneLabel(timeZone?: string | null, instant: string | Date = new Date()): string {
  return timeZoneName(timeZone, instant, "shortGeneric");
}

/** Long generic name, stable across DST: "Eastern Time". */
export function venueZoneLongName(timeZone?: string | null, instant: string | Date = new Date()): string {
  return timeZoneName(timeZone, instant, "longGeneric");
}

function wallParts(iso: string, timeZone: string): WallParts {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid instant.");
  }
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  let hour = read("hour");
  if (hour === "24") hour = "00";
  return {
    year: read("year"),
    month: read("month").padStart(2, "0"),
    day: read("day").padStart(2, "0"),
    hour: hour.padStart(2, "0"),
    minute: read("minute").padStart(2, "0"),
    second: read("second").padStart(2, "0"),
  };
}

export function formatGigWhen(iso: string, timeZone?: string | null) {
  const zone = resolveTimeZone(timeZone);
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
  return `${formatted} ${venueZoneLabel(zone, iso)}`;
}

export function formatGigDay(iso: string, timeZone?: string | null) {
  const zone = resolveTimeZone(timeZone);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(iso));
}

/** Venue-local calendar date, `YYYY-MM-DD`. Used to bucket gigs onto a day. */
export function localDateKey(iso: string, timeZone?: string | null) {
  const parts = wallParts(iso, resolveTimeZone(timeZone));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/**
 * Wall time for an `<input type="datetime-local">`. The value has no offset;
 * it is the venue clock, not the browser's timezone.
 */
export function toVenueDateTimeLocal(iso: string, timeZone?: string | null) {
  const parts = wallParts(iso, resolveTimeZone(timeZone));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

/** True when the gig's instant has not started yet. Comparison is absolute, not a calendar day. */
export function isUpcoming(iso: string, now = new Date()) {
  const time = new Date(iso).getTime();
  return Number.isFinite(time) && time >= now.getTime();
}

/**
 * Discovery date filter. A selected day matches the venue-local date.
 * With no selection, the gig is on today's venue date or later.
 * `timeZone` is the gig's IANA zone when one exists.
 */
export function gigMatchesVenueDate(
  iso: string,
  selectedDate: string,
  now = new Date(),
  timeZone?: string | null,
) {
  const zone = resolveTimeZone(timeZone);
  const gigDay = localDateKey(iso, zone);
  if (selectedDate) return gigDay === selectedDate;
  return gigDay >= localDateKey(now.toISOString(), zone);
}
