/**
 * Venue timezone for the Austin MVP. There is no per-gig zone column;
 * pass an IANA id into these helpers when one is added.
 * Chicago is UTC−05:00 in summer (CDT) and UTC−06:00 in winter (CST).
 */
export const VENUE_TIME_ZONE = "America/Chicago";

type WallParts = {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
  second: string;
};

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

export function formatGigWhen(iso: string, timeZone = VENUE_TIME_ZONE) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatGigDay(iso: string, timeZone = VENUE_TIME_ZONE) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(iso));
}

/** Venue-local calendar date, `YYYY-MM-DD`. Used to bucket gigs onto a day. */
export function localDateKey(iso: string, timeZone = VENUE_TIME_ZONE) {
  const parts = wallParts(iso, timeZone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/**
 * Wall time for an `<input type="datetime-local">`. The value has no offset;
 * it is the venue clock, not the browser's timezone.
 */
export function toVenueDateTimeLocal(iso: string, timeZone = VENUE_TIME_ZONE) {
  const parts = wallParts(iso, timeZone);
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
 */
export function gigMatchesVenueDate(iso: string, selectedDate: string, now = new Date()) {
  const gigDay = localDateKey(iso);
  if (selectedDate) return gigDay === selectedDate;
  return gigDay >= localDateKey(now.toISOString());
}
