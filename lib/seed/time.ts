import { venueOffsetIso } from "@/lib/venue-instant";

/**
 * A Chicago wall-clock time `daysFromToday` after `now`'s Chicago calendar date.
 * Returns an ISO string with that instant's numeric offset, so the result does
 * not depend on the host timezone. DST is resolved by {@link venueOffsetIso}.
 */
export function austinDateTime(
  daysFromToday: number,
  hour: number,
  minute: number,
  now = new Date(),
): string {
  return venueOffsetIso(daysFromToday, hour, minute, now);
}
