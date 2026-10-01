import { MYSTIC_CENTER } from "@/lib/map-style";
import { gigsWithinRadius } from "@/lib/nearby";

/** Geolocation API timeout. A miss leaves the map on the Mystic default. */
export const VISITOR_LOCATION_TIMEOUT_MS = 5_000;

const PERMISSION_DENIED = 1;
const TIMEOUT = 3;

export type VisitorLocationResult =
  | { status: "granted"; lat: number; lng: number }
  | { status: "denied" }
  | { status: "timeout" }
  | { status: "unsupported" };

type GeoPosition = { coords: { latitude: number; longitude: number } };
type GeoError = { code: number };

export type VisitorGeolocation = {
  getCurrentPosition: (
    success: (position: GeoPosition) => void,
    error?: (error: GeoError) => void,
    options?: PositionOptions,
  ) => void;
};

/**
 * One-shot browser geolocation. The coordinates are returned to the caller
 * for the map camera only. This function does not write storage, cookies,
 * or send the position anywhere.
 */
export function requestVisitorLocation(
  geolocation: VisitorGeolocation | null | undefined,
  timeoutMs = VISITOR_LOCATION_TIMEOUT_MS,
): Promise<VisitorLocationResult> {
  if (!geolocation || typeof geolocation.getCurrentPosition !== "function") {
    return Promise.resolve({ status: "unsupported" });
  }
  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: VisitorLocationResult) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };
    try {
      geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            finish({ status: "unsupported" });
            return;
          }
          finish({ status: "granted", lat, lng });
        },
        (error) => {
          if (error?.code === PERMISSION_DENIED) finish({ status: "denied" });
          else if (error?.code === TIMEOUT) finish({ status: "timeout" });
          else finish({ status: "denied" });
        },
        { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 0 },
      );
    } catch {
      finish({ status: "unsupported" });
    }
  });
}

export function mapCenterForVisitor(result: VisitorLocationResult): {
  lat: number;
  lng: number;
  zoom: number;
} {
  if (result.status === "granted") {
    return { lat: result.lat, lng: result.lng, zoom: MYSTIC_CENTER.zoom };
  }
  return { lat: MYSTIC_CENTER.lat, lng: MYSTIC_CENTER.lng, zoom: MYSTIC_CENTER.zoom };
}

/** Set when the automatic visit is about to call getCurrentPosition. */
export const GEO_ASKED_KEY = "gigmap:geo-asked";

/** Last camera fix for this tab. sessionStorage and memory only; not sent to the server. */
export const GEO_POSITION_KEY = "gigmap:geo-position";

export const FAR_FROM_GIGS_HINT = "No gigs near you yet. Showing Mystic, CT";

export type GeoPermission = "granted" | "denied" | "prompt" | "unsupported";

export type RememberedPosition = { lat: number; lng: number };

export type VisitorGeoMemory = {
  asked: boolean;
  position: RememberedPosition | null;
};

export type GeoFlagStore = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

export type GeolocationPermissionSource = {
  query?: (descriptor: { name: "geolocation" }) => Promise<{ state: string }>;
} | null;

/** In-tab copy of the session fix so a remount can reuse it without asking again. */
const visitMemory: VisitorGeoMemory = { asked: false, position: null };

export function visitorSessionMemory(): VisitorGeoMemory {
  return visitMemory;
}

export function decideAutomaticGeolocation(input: {
  permission: GeoPermission;
  alreadyAsked: boolean;
}): { locate: boolean; markAsked: boolean } {
  if (input.permission === "granted") {
    return { locate: true, markAsked: false };
  }
  if (input.permission === "denied") {
    return { locate: false, markAsked: false };
  }
  if (input.alreadyAsked) {
    return { locate: false, markAsked: false };
  }
  return { locate: true, markAsked: true };
}

export async function readGeolocationPermission(
  permissions: GeolocationPermissionSource | undefined,
): Promise<GeoPermission> {
  if (!permissions || typeof permissions.query !== "function") return "unsupported";
  try {
    const status = await permissions.query({ name: "geolocation" });
    if (status.state === "granted" || status.state === "denied" || status.state === "prompt") {
      return status.state;
    }
    return "unsupported";
  } catch {
    return "unsupported";
  }
}

export type VisitorVisitOutcome = {
  camera: { lat: number; lng: number; zoom: number };
  showFarHint: boolean;
  calledGetCurrentPosition: boolean;
};

/**
 * Automatic visit locate. "Near me" does not use this. A fix more than 70 km
 * from every gig keeps the Mystic camera.
 */
export async function locateVisitorForVisit(input: {
  permissions: GeolocationPermissionSource | undefined;
  geolocation: VisitorGeolocation | null | undefined;
  storage: GeoFlagStore | null;
  memory: VisitorGeoMemory;
  gigs: readonly { location: { lat: number; lng: number } }[] | (() => readonly { location: { lat: number; lng: number } }[]);
  timeoutMs?: number;
}): Promise<VisitorVisitOutcome> {
  const permission = await readGeolocationPermission(input.permissions);
  const alreadyAsked = readAsked(input.storage, input.memory);
  const decision = decideAutomaticGeolocation({ permission, alreadyAsked });

  if (decision.locate) {
    if (decision.markAsked) markAsked(input.storage, input.memory);
    const result = await requestVisitorLocation(input.geolocation, input.timeoutMs);
    if (result.status === "granted") {
      rememberPosition({ lat: result.lat, lng: result.lng }, input.storage, input.memory);
    }
  }

  const position = recallPosition(input.storage, input.memory);
  const gigs = typeof input.gigs === "function" ? input.gigs() : input.gigs;
  const camera = cameraForVisitorFix(position, gigs);
  return {
    camera: { lat: camera.lat, lng: camera.lng, zoom: camera.zoom },
    showFarHint: camera.showFarHint,
    calledGetCurrentPosition: decision.locate,
  };
}

export function cameraForVisitorFix(
  position: RememberedPosition | null,
  gigs: readonly { location: { lat: number; lng: number } }[],
): { lat: number; lng: number; zoom: number; showFarHint: boolean } {
  const mystic = {
    lat: MYSTIC_CENTER.lat,
    lng: MYSTIC_CENTER.lng,
    zoom: MYSTIC_CENTER.zoom,
    showFarHint: false,
  };
  if (!position || !Number.isFinite(position.lat) || !Number.isFinite(position.lng)) {
    return mystic;
  }
  const nearby = gigsWithinRadius(
    gigs.map((gig, index) => ({ id: String(index), location: gig.location })),
    position,
  );
  if (nearby.length === 0) {
    return { ...mystic, showFarHint: true };
  }
  return {
    lat: position.lat,
    lng: position.lng,
    zoom: MYSTIC_CENTER.zoom,
    showFarHint: false,
  };
}

function readAsked(storage: GeoFlagStore | null, memory: VisitorGeoMemory): boolean {
  if (memory.asked) return true;
  if (readItem(storage, GEO_ASKED_KEY) === "1") {
    memory.asked = true;
    return true;
  }
  return false;
}

function markAsked(storage: GeoFlagStore | null, memory: VisitorGeoMemory) {
  memory.asked = true;
  writeItem(storage, GEO_ASKED_KEY, "1");
}

function rememberPosition(
  position: RememberedPosition,
  storage: GeoFlagStore | null,
  memory: VisitorGeoMemory,
) {
  memory.position = { lat: position.lat, lng: position.lng };
  writeItem(storage, GEO_POSITION_KEY, JSON.stringify(memory.position));
}

function recallPosition(
  storage: GeoFlagStore | null,
  memory: VisitorGeoMemory,
): RememberedPosition | null {
  if (isPosition(memory.position)) return memory.position;
  const stored = parsePosition(readItem(storage, GEO_POSITION_KEY));
  if (stored) memory.position = stored;
  return stored;
}

function isPosition(value: RememberedPosition | null): value is RememberedPosition {
  return Boolean(value && Number.isFinite(value.lat) && Number.isFinite(value.lng));
}

function parsePosition(raw: string | null): RememberedPosition | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { lat?: unknown; lng?: unknown };
    if (typeof parsed.lat !== "number" || typeof parsed.lng !== "number") return null;
    if (!Number.isFinite(parsed.lat) || !Number.isFinite(parsed.lng)) return null;
    if (parsed.lat < -90 || parsed.lat > 90 || parsed.lng < -180 || parsed.lng > 180) return null;
    return { lat: parsed.lat, lng: parsed.lng };
  } catch {
    return null;
  }
}

function readItem(storage: GeoFlagStore | null, key: string): string | null {
  if (!storage) return null;
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function writeItem(storage: GeoFlagStore | null, key: string, value: string) {
  if (!storage) return;
  try {
    storage.setItem(key, value);
  } catch {
    // Private mode can reject sessionStorage. The in-memory copy still applies.
  }
}
