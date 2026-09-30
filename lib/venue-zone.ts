import { Temporal } from "@js-temporal/polyfill";
import type { GigSourceKind } from "@/lib/types";
import { timeZoneAt } from "@/lib/tz-at";

/**
 * Area/location IANA names only. POSIX abbreviations (`EST`) and fixed
 * offsets (`Etc/GMT`) are rejected. The same pattern is the CHECK in
 * `supabase/migrations/20260930180000_gigs_add_timezone.sql`.
 */
export const VENUE_TIME_ZONE_PATTERN =
  /^(Africa|America|Antarctica|Arctic|Asia|Atlantic|Australia|Europe|Indian|Pacific)\/[A-Za-z0-9_+-]+(\/[A-Za-z0-9_+-]+){0,1}$/;

const PIN_ERROR = "Drop the pin on the venue so a time zone can be determined.";

export function isVenueTimeZoneName(zone: string): boolean {
  return VENUE_TIME_ZONE_PATTERN.test(zone);
}

/**
 * Offline lat/lng → IANA lookup for a stored gig zone. Uses the same `tz-lookup`
 * wrapper as display (`timeZoneAt`). The server calls this when a gig is created
 * and does not accept a client-submitted zone. Display imports `timeZoneAt`
 * directly; do not import this module from a client component.
 */
export function lookupVenueTimeZone(lat: number, lng: number): string {
  const zone = timeZoneAt(lat, lng);
  if (!zone || !isVenueTimeZoneName(zone)) throw new Error(PIN_ERROR);
  try {
    Temporal.Now.zonedDateTimeISO(zone);
  } catch {
    throw new Error(PIN_ERROR);
  }
  return zone;
}

export type TimezoneBackfillRow = {
  id: string;
  lat: number;
  lng: number;
  timezone: string | null;
};

/** Rows that still need a zone. A stored zone is left alone, even if a fresh lookup would differ. */
export function planTimezoneBackfill(
  rows: TimezoneBackfillRow[],
): Array<{ id: string; timezone: string }> {
  const updates: Array<{ id: string; timezone: string }> = [];
  for (const row of rows) {
    if (row.timezone != null) continue;
    updates.push({ id: row.id, timezone: lookupVenueTimeZone(row.lat, row.lng) });
  }
  return updates;
}

/** Use a stored zone when it is well-formed. Otherwise derive one from the pin. */
export function readStoredTimeZone(
  stored: string | null | undefined,
  lat: number,
  lng: number,
): string {
  if (stored && isVenueTimeZoneName(stored)) return stored;
  return lookupVenueTimeZone(lat, lng);
}

export function readStoredSource(
  sourceKind: string | null | undefined,
  sourceUrl: string | null | undefined,
): { sourceKind: GigSourceKind | null; sourceUrl: string | null } {
  const url = typeof sourceUrl === "string" && /^https:\/\/\S+$/.test(sourceUrl) ? sourceUrl : null;
  const kind = sourceKind === "owner" || sourceKind === "public_info" ? sourceKind : null;
  if (kind === "public_info" && !url) return { sourceKind: null, sourceUrl: null };
  return { sourceKind: kind, sourceUrl: url };
}
