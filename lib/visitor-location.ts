import { MYSTIC_CENTER } from "@/lib/map-style";

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
