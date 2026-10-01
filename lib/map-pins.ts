/** Right-edge clearance for the zoom and geolocate controls. */
export const MAP_CONTROL_CLEARANCE_PX = 60;

/** Bottom-edge clearance so a pin center stays off the attribution line. */
export const MAP_ATTRIBUTION_CLEARANCE_PX = 36;

/** Tap target used by `.gig-marker` and `.gig-cluster`. */
export const MARKER_TAP_PX = 44;

/**
 * MapLibre clusters points closer than this many screen pixels.
 * Slightly above the tap target so overlapping pins become one cluster.
 */
export const CLUSTER_RADIUS_PX = 56;

/** Identical coordinates still cluster at every zoom up to this level. */
export const CLUSTER_MAX_ZOOM = 16;

/** About a meter. Pins inside this are treated as the same venue. */
const SAME_VENUE_DEGREES = 0.00001;

export type ViewPadding = { top: number; right: number; bottom: number; left: number };

/**
 * Padding for `fitBounds` and the fallback camera.
 * Wide maps keep the floating filter card clear of the pins.
 * The right inset stays at least {@link MAP_CONTROL_CLEARANCE_PX} until the
 * canvas is too short to spare it (`height * 0.4`).
 */
export function mapViewPadding(width: number, height: number): ViewPadding {
  const wide = width >= 768;
  const maxPad = Math.max(16, height * 0.4);
  const limit = (value: number) => Math.min(Math.max(0, value), maxPad);
  return {
    top: limit(wide ? Math.round(height * 0.3) : 16),
    right: limit(MAP_CONTROL_CLEARANCE_PX),
    bottom: limit(Math.max(MAP_ATTRIBUTION_CLEARANCE_PX, wide ? 48 : MAP_ATTRIBUTION_CLEARANCE_PX)),
    left: limit(wide ? 48 : 16),
  };
}

export type PinPoint = { id: string; lng: number; lat: number };

export function venueKey(lng: number, lat: number): string {
  const step = SAME_VENUE_DEGREES;
  const qx = Math.round(lng / step) * step;
  const qy = Math.round(lat / step) * step;
  return `${qx.toFixed(5)},${qy.toFixed(5)}`;
}

/** True when every point sits on the same venue, so zooming cannot separate them. */
export function pinsShareCoordinates(points: readonly { lng: number; lat: number }[]): boolean {
  if (points.length < 2) return true;
  const key = venueKey(points[0].lng, points[0].lat);
  return points.every((point) => venueKey(point.lng, point.lat) === key);
}

/**
 * Pixel offsets for pins that share a venue. A lone pin stays at the origin.
 * Two or more sit on a ring so neighboring centers are at least `minSeparationPx` apart.
 */
export function venuePinOffsets(
  points: readonly PinPoint[],
  minSeparationPx = MARKER_TAP_PX + 4,
): Map<string, { x: number; y: number }> {
  const groups = new Map<string, string[]>();
  for (const point of points) {
    const key = venueKey(point.lng, point.lat);
    const list = groups.get(key);
    if (list) list.push(point.id);
    else groups.set(key, [point.id]);
  }
  const offsets = new Map<string, { x: number; y: number }>();
  for (const ids of groups.values()) {
    ids.sort();
    if (ids.length === 1) {
      offsets.set(ids[0], { x: 0, y: 0 });
      continue;
    }
    const radius = minSeparationPx / (2 * Math.sin(Math.PI / ids.length));
    ids.forEach((id, index) => {
      const angle = (2 * Math.PI * index) / ids.length - Math.PI / 2;
      offsets.set(id, {
        x: Math.round(radius * Math.cos(angle)),
        y: Math.round(radius * Math.sin(angle)),
      });
    });
  }
  return offsets;
}

/** Public path of the MapLibre module worker copied into `public/maplibre`. */
export const MAPLIBRE_WORKER_PATH = "/maplibre/maplibre-gl-worker.mjs";

/** Absolute worker URL. Empty origins are rejected so `new Worker('')` cannot recur. */
export function maplibreWorkerUrl(origin: string): string {
  const url = new URL(MAPLIBRE_WORKER_PATH, origin);
  if (!/^https?:$/.test(url.protocol) || !url.pathname.endsWith("maplibre-gl-worker.mjs")) {
    throw new Error(`MapLibre worker URL is not a served script: ${url.href}`);
  }
  return url.href;
}
