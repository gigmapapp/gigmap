import { venueOffsetIso } from "@/lib/venue-instant";

/** Austin seed stays on Chicago even though the launch default is America/New_York. */
const AUSTIN_SEED_TIME_ZONE = "America/Chicago";

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
  return venueOffsetIso(daysFromToday, hour, minute, now, AUSTIN_SEED_TIME_ZONE);
}
