import { timeZoneAt } from "@/lib/tz-at";
import { resolveTimeZone, VENUE_TIME_ZONE } from "@/lib/venue-time";

type GigZoneSource = {
  timezone?: string | null;
  location?: { lat: number; lng: number } | null;
};

/**
 * Zone used to render a gig. A stored IANA id wins. Otherwise the pin's
 * zone, from an offline lookup. America/New_York only when that lookup
 * has nothing to use. Display only: this value is not saved.
 */
export function zoneForGig(gig: GigZoneSource): string {
  const stored = typeof gig.timezone === "string" ? gig.timezone.trim() : "";
  if (stored && resolveTimeZone(stored) === stored) return stored;
  const lat = gig.location?.lat;
  const lng = gig.location?.lng;
  if (lat != null && lng != null) {
    const fromPin = timeZoneAt(lat, lng);
    if (fromPin) return fromPin;
  }
  return VENUE_TIME_ZONE;
}
