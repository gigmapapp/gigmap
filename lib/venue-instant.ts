import { Temporal } from "@js-temporal/polyfill";
import { localDateKey, resolveTimeZone } from "@/lib/venue-time";

const DATE_TIME_LOCAL = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

/**
 * Interpret an HTML `datetime-local` value as venue wall time and return a UTC instant.
 *
 * The string has no offset. It is not parsed with `new Date`, which would use the
 * server timezone (UTC on Vercel) and store the gig hours early.
 *
 * DST uses Temporal's `compatible` disambiguation, which does not depend on the host zone:
 * - Overlap, when clocks fall back: keep the earlier instant, still on daylight time.
 * - Gap, when clocks spring forward: move forward by the skipped hour.
 *
 * Omitted, null, or invalid `timeZone` uses the launch default (America/New_York).
 * Pass another IANA id for a different venue. The create-gig action passes the
 * zone looked up from the pin, so a posted time is that venue's wall clock.
 */
export function parseVenueDateTimeLocal(value: string, timeZone?: string | null): string {
  const zoned = zonedFromLocal(value, resolveTimeZone(timeZone));
  return new Date(zoned.epochMilliseconds).toISOString();
}

/** Midnight at the start of the venue-local calendar day that contains `date`. */
export function startOfLocalDay(date = new Date(), timeZone?: string | null): Date {
  const zone = resolveTimeZone(timeZone);
  const key = localDateKey(date.toISOString(), zone);
  return new Date(parseVenueDateTimeLocal(`${key}T00:00`, zone));
}

/**
 * ISO string whose wall clock and numeric offset match the venue zone.
 * The numeric offset is included so the instant does not depend on the host zone.
 */
export function venueOffsetIso(
  daysFromToday: number,
  hour: number,
  minute: number,
  now = new Date(),
  timeZone?: string | null,
): string {
  const zone = resolveTimeZone(timeZone);
  const day = Temporal.Instant.fromEpochMilliseconds(now.getTime())
    .toZonedDateTimeISO(zone)
    .toPlainDate()
    .add({ days: daysFromToday });
  const local = `${pad(day.year)}-${pad(day.month)}-${pad(day.day)}T${pad(hour)}:${pad(minute)}`;
  const zoned = zonedFromLocal(local, zone);
  const iso = `${pad(zoned.year)}-${pad(zoned.month)}-${pad(zoned.day)}T${pad(zoned.hour)}:${pad(zoned.minute)}:00${zoned.offset}`;
  if (Number.isNaN(new Date(iso).getTime())) {
    throw new Error(`Invalid venue datetime: ${iso}`);
  }
  return iso;
}

function zonedFromLocal(value: string, timeZone: string): Temporal.ZonedDateTime {
  const match = DATE_TIME_LOCAL.exec(value.trim());
  if (!match) throw new Error("Enter a valid date and time.");
  try {
    return Temporal.ZonedDateTime.from(
      {
        timeZone,
        year: Number(match[1]),
        month: Number(match[2]),
        day: Number(match[3]),
        hour: Number(match[4]),
        minute: Number(match[5]),
        second: Number(match[6] ?? 0),
      },
      { disambiguation: "compatible", overflow: "reject" },
    );
  } catch (error) {
    if (error instanceof RangeError) throw new Error("Enter a valid date and time.");
    throw error;
  }
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}
