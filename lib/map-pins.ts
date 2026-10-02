/** Right-edge clearance for the zoom and geolocate controls. */
export const MAP_CONTROL_CLEARANCE_PX = 60;

/** Bottom-edge clearance so a pin center stays off the attribution line. */
export const MAP_ATTRIBUTION_CLEARANCE_PX = 36;

/** Tap target used by `.gig-marker` and `.gig-cluster`. */
export const MARKER_TAP_PX = 44;

/**
 * Inset so a centered marker's box stays inside the canvas.
 * Half the tap target, plus 12px of slack.
 */
export const MARKER_EDGE_CLEARANCE_PX = MARKER_TAP_PX / 2 + 12;

/** Gap kept between an open popup and the map edges. Bottom is larger so the card clears the attribution. */
export const POPUP_FIT_PADDING = { top: 8, right: 8, bottom: 24, left: 8 };

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
 * Every side clears at least {@link MARKER_EDGE_CLEARANCE_PX} so a marker
 * centered on the bounds stays inside the canvas. Wide maps add room for the
 * floating filter card. The right inset stays at least
 * {@link MAP_CONTROL_CLEARANCE_PX} until the canvas is too short to spare it.
 */
export function mapViewPadding(width: number, height: number): ViewPadding {
  const wide = width >= 768;
  const edge = MARKER_EDGE_CLEARANCE_PX;
  const maxPad = Math.max(edge, height * 0.4);
  const limit = (value: number) => Math.min(Math.max(0, value), maxPad);
  return {
    top: limit(wide ? Math.max(edge, Math.round(height * 0.3)) : edge),
    right: limit(Math.max(MAP_CONTROL_CLEARANCE_PX, edge)),
    bottom: limit(Math.max(MAP_ATTRIBUTION_CLEARANCE_PX, edge, wide ? 48 : edge)),
    left: limit(wide ? Math.max(48, edge) : edge),
  };
}

export type PopupBox = { left: number; top: number; right: number; bottom: number };

/**
 * Pixel pan that brings a popup inside the map. The anchor pin is included
 * when the pair still fits; otherwise the popup wins. Positive x pans east
 * (content moves left). Positive y pans south (content moves up).
 */
export function popupPanBy(
  mapBox: PopupBox,
  popupBox: PopupBox,
  pinBox: PopupBox | null,
  padding = POPUP_FIT_PADDING,
): [number, number] | null {
  if (popupBox.right - popupBox.left < 1 || popupBox.bottom - popupBox.top < 1) return null;
  const inner = {
    left: mapBox.left + padding.left,
    top: mapBox.top + padding.top,
    right: mapBox.right - padding.right,
    bottom: mapBox.bottom - padding.bottom,
  };
  const innerWidth = inner.right - inner.left;
  const innerHeight = inner.bottom - inner.top;
  if (innerWidth < 1 || innerHeight < 1) return null;

  let bounds = popupBox;
  if (pinBox && pinBox.right - pinBox.left >= 1 && pinBox.bottom - pinBox.top >= 1) {
    const union = {
      left: Math.min(popupBox.left, pinBox.left),
      top: Math.min(popupBox.top, pinBox.top),
      right: Math.max(popupBox.right, pinBox.right),
      bottom: Math.max(popupBox.bottom, pinBox.bottom),
    };
    if (union.right - union.left <= innerWidth && union.bottom - union.top <= innerHeight) {
      bounds = union;
    }
  }

  const popupTooWide = popupBox.right - popupBox.left > innerWidth;
  const popupTooTall = popupBox.bottom - popupBox.top > innerHeight;
  const overflowLeft = inner.left - bounds.left;
  const overflowRight = bounds.right - inner.right;
  const overflowTop = inner.top - bounds.top;
  const overflowBottom = bounds.bottom - inner.bottom;
  let x = 0;
  let y = 0;
  if (overflowLeft > 1) x = -overflowLeft;
  else if (!popupTooWide && overflowRight > 1) x = overflowRight;
  if (overflowTop > 1) y = -overflowTop;
  else if (!popupTooTall && overflowBottom > 1) y = overflowBottom;
  if (Math.abs(x) < 1 && Math.abs(y) < 1) return null;
  return [x, y];
}

/**
 * Max height of popup content on a narrow map so the card can scroll instead
 * of spilling out of the canvas. Wide maps keep the natural height.
 */
export function popupContentMaxHeight(mapWidth: number, mapHeight: number): number | null {
  if (mapWidth >= 768 || mapHeight < 2) return null;
  const contentPadding = 24;
  const tip = 12;
  const available =
    mapHeight - POPUP_FIT_PADDING.top - POPUP_FIT_PADDING.bottom - contentPadding - tip;
  return Math.max(MARKER_TAP_PX, Math.floor(available));
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
