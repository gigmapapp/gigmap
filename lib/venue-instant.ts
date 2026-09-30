import { Temporal } from "@js-temporal/polyfill";
import { localDateKey, VENUE_TIME_ZONE } from "@/lib/venue-time";

const DATE_TIME_LOCAL = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

/**
 * Interpret an HTML `datetime-local` value as venue wall time and return a UTC instant.
 *
 * The string has no offset. It is not parsed with `new Date`, which would use the
 * server timezone (UTC on Vercel) and store the gig hours early.
 *
 * DST uses Temporal's `compatible` disambiguation, which does not depend on the host zone:
 * - Overlap, when clocks fall back (1:30 AM Chicago on 2026-11-01 happens twice):
 *   keep the earlier instant, still on daylight time (CDT, UTC−05:00).
 * - Gap, when clocks spring forward (2:30 AM Chicago on 2026-03-08 does not exist):
 *   move forward by the skipped hour and store 3:30 AM CDT (UTC−05:00).
 */
export function parseVenueDateTimeLocal(value: string, timeZone = VENUE_TIME_ZONE): string {
  const zoned = zonedFromLocal(value, timeZone);
  return new Date(zoned.epochMilliseconds).toISOString();
}

/** Midnight at the start of the venue-local calendar day that contains `date`. */
export function startOfLocalDay(date = new Date(), timeZone = VENUE_TIME_ZONE): Date {
  const key = localDateKey(date.toISOString(), timeZone);
  return new Date(parseVenueDateTimeLocal(`${key}T00:00`, timeZone));
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
  timeZone = VENUE_TIME_ZONE,
): string {
  const day = Temporal.Instant.fromEpochMilliseconds(now.getTime())
    .toZonedDateTimeISO(timeZone)
    .toPlainDate()
    .add({ days: daysFromToday });
  const local = `${pad(day.year)}-${pad(day.month)}-${pad(day.day)}T${pad(hour)}:${pad(minute)}`;
  const zoned = zonedFromLocal(local, timeZone);
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
