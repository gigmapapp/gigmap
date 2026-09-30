import tzLookup from "tz-lookup";

/**
 * Offline IANA zone for a pin. Used to label a gig that has no stored zone,
 * and as the post-form hint. The value is not submitted and is not stored.
 */
export function timeZoneAt(lat: number, lng: number): string | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  try {
    const zone = tzLookup(lat, lng);
    if (!zone || zone.startsWith("Etc/")) return null;
    return zone;
  } catch {
    return null;
  }
}
