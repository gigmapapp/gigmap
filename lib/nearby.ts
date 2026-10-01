/** Gigs farther than this from the active center are left out of fitBounds. */
export const NEARBY_RADIUS_KM = 70;

const EARTH_KM = 6371;

export type MapPoint = { lat: number; lng: number };

export function distanceKm(a: MapPoint, b: MapPoint): number {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function gigsWithinRadius<T extends { location: MapPoint }>(
  gigs: readonly T[],
  center: MapPoint,
  radiusKm = NEARBY_RADIUS_KM,
): T[] {
  return gigs.filter((gig) => distanceKm(center, gig.location) <= radiusKm);
}
