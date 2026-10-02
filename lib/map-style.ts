import { ACCENT } from "@/lib/accent";
import type { SourceSpecification, StyleSpecification } from "maplibre-gl";

/**
 * GNIS populated place for Mystic, Connecticut (41.354266°N, 71.966462°W).
 * Zoom matches the previous metro framing.
 */
export const MYSTIC_CENTER = {
  lng: -71.966462,
  lat: 41.354266,
  zoom: 12.35,
};

/**
 * Keyless CARTO Voyager vector style.
 * The muted slate/dusk look is a canvas filter in `app/globals.css`. Voyager is a
 * large vector stylesheet, so a canvas filter is the practical treatment. It does
 * not paint HTML pins, clusters, or the attribution control.
 */
export const VOYAGER_STYLE_URL = "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";

/**
 * Visible text: © CARTO, © OpenStreetMap contributors.
 * CARTO's TileJSON links elsewhere; this replaces that attribution.
 */
export const MAP_ATTRIBUTION =
  '&copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>, &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors';

export function attributeVoyagerStyle(
  _previous: StyleSpecification | undefined,
  next: StyleSpecification,
): StyleSpecification {
  const sources = { ...next.sources };
  for (const key of Object.keys(sources)) {
    const source = sources[key];
    if (!source || typeof source !== "object") continue;
    sources[key] = stampAttribution(source);
  }
  return { ...next, sources };
}

function stampAttribution(source: SourceSpecification): SourceSpecification {
  if (
    source.type === "vector" ||
    source.type === "raster" ||
    source.type === "raster-dem" ||
    source.type === "geojson"
  ) {
    return { ...source, attribution: MAP_ATTRIBUTION };
  }
  return source;
}

/** Abort a hung Voyager stylesheet request and use the raster fallback. */
export const VOYAGER_STYLE_TIMEOUT_MS = 5_000;

const VOYAGER_RASTER_TILES = [0, 1, 2, 3].map(
  (index) => `https://${"abcd"[index]}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png`,
);

const OSM_RASTER_TILES = ["a", "b", "c"].map(
  (host) => `https://${host}.tile.openstreetmap.org/{z}/{x}/{y}.png`,
);

/** CARTO Voyager raster. Used when the vector stylesheet cannot be loaded. */
export function voyagerRasterStyle(): StyleSpecification {
  return rasterStyle("voyager", VOYAGER_RASTER_TILES);
}

/** OSM raster. Used when the CARTO raster tiles themselves fail. */
export function osmRasterStyle(): StyleSpecification {
  return rasterStyle("osm", OSM_RASTER_TILES);
}

function rasterStyle(id: string, tiles: string[]): StyleSpecification {
  return {
    version: 8,
    sources: {
      [id]: {
        type: "raster",
        tiles,
        tileSize: 256,
        attribution: MAP_ATTRIBUTION,
      },
    },
    layers: [{ id, type: "raster", source: id }],
  };
}

export type VoyagerStyleLoader = {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

let voyagerStylePromise: Promise<StyleSpecification> | null = null;
let styleWarned = false;
let tileWarned = false;
let osmFallbackUsed = false;

function warnOnce(kind: "style" | "tile", message: string, detail: unknown) {
  if (kind === "style") {
    if (styleWarned) return;
    styleWarned = true;
  } else {
    if (tileWarned) return;
    tileWarned = true;
  }
  console.warn(message, detail);
}

function errorText(error: unknown): string {
  if (!error || typeof error !== "object") return String(error ?? "");
  const url = "url" in error && typeof error.url === "string" ? error.url : "";
  const message = "message" in error && typeof error.message === "string" ? error.message : "";
  return `${message} ${url}`.trim();
}

async function fetchVoyagerStyle(options?: VoyagerStyleLoader): Promise<StyleSpecification> {
  const timeoutMs = options?.timeoutMs ?? VOYAGER_STYLE_TIMEOUT_MS;
  const fetchImpl = options?.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(VOYAGER_STYLE_URL, { signal: controller.signal });
    if (!response.ok) throw new Error(`Voyager style ${response.status}`);
    const style = (await response.json()) as StyleSpecification;
    if (!style || typeof style !== "object" || !style.sources) throw new Error("Voyager style JSON");
    return attributeVoyagerStyle(undefined, style);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetches Voyager and stamps the required CARTO and OSM attribution.
 * A network error, non-2xx response, bad JSON, or timeout resolves to CARTO raster tiles
 * instead of rejecting, so the map can still draw pins.
 */
export function loadVoyagerStyle(options?: VoyagerStyleLoader): Promise<StyleSpecification> {
  const load = () =>
    fetchVoyagerStyle(options).catch((error: unknown) => {
      warnOnce("style", "[gigmap] Voyager style unavailable; using CARTO raster tiles", error);
      return voyagerRasterStyle();
    });
  if (options) return load();
  voyagerStylePromise ??= load();
  return voyagerStylePromise;
}

type MapStyleHost = {
  getStyle(): StyleSpecification | undefined;
  setStyle(style: StyleSpecification): void;
  once(type: "style.load", listener: () => void): void;
};

/**
 * Swallow a map error so it is not an unhandled rejection. If CARTO raster tiles fail,
 * switch to OSM once and call `onRasterReplaced` after the new style loads.
 */
export function noteMapError(map: MapStyleHost, error: unknown, onRasterReplaced?: () => void) {
  warnOnce("tile", "[gigmap] map error", error);
  if (osmFallbackUsed) return;
  const source = map.getStyle()?.sources?.voyager;
  if (!source || source.type !== "raster") return;
  const text = errorText(error);
  if (!text.includes("rastertiles/voyager")) return;
  osmFallbackUsed = true;
  if (onRasterReplaced) map.once("style.load", onRasterReplaced);
  map.setStyle(osmRasterStyle());
}

export const CATEGORY_MARKER: Record<string, string> = {
  solo: ACCENT,
  band: "#FAFAFA",
  dj: "#FB7185",
};
