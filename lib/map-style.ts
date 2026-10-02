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
 * Only the loaded Voyager vector style uses this. The raster fallback is OSM-only.
 */
export const MAP_ATTRIBUTION =
  '&copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>, &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors';

/** Visible text: © OpenStreetMap contributors, with the name linked to the copyright page. */
export const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>';

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

/** Abort a hung Voyager stylesheet request and use the OSM raster fallback. */
export const VOYAGER_STYLE_TIMEOUT_MS = 5_000;

/**
 * OSM standard raster. CARTO's keyless raster endpoint answers 200 with
 * "API KEY REQUIRED" watermark tiles, so it is not a usable fallback.
 */
export function osmRasterStyle(): StyleSpecification {
  return {
    version: 8,
    sources: {
      osm: {
        type: "raster",
        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        maxzoom: 19,
        attribution: OSM_ATTRIBUTION,
      },
    },
    layers: [{ id: "osm", type: "raster", source: "osm" }],
  };
}

export type VoyagerStyleLoader = {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

let voyagerStylePromise: Promise<StyleSpecification> | null = null;
let styleWarned = false;
let tileWarned = false;

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
 * A network error, non-2xx response, bad JSON, or timeout resolves to OSM raster
 * tiles instead of rejecting, so the map can still draw pins.
 */
export function loadVoyagerStyle(options?: VoyagerStyleLoader): Promise<StyleSpecification> {
  const load = () =>
    fetchVoyagerStyle(options).catch((error: unknown) => {
      warnOnce("style", "[gigmap] Voyager style unavailable; using OpenStreetMap tiles", error);
      return osmRasterStyle();
    });
  if (options) return load();
  voyagerStylePromise ??= load();
  return voyagerStylePromise;
}

/**
 * Swallow a map error so it is not an unhandled rejection.
 * The stylesheet fallback is already OSM, so a later tile error is logged once.
 */
export function noteMapError(_map: object, error: unknown) {
  warnOnce("tile", "[gigmap] map error", error);
}

export const CATEGORY_MARKER: Record<string, string> = {
  solo: ACCENT,
  band: "#FAFAFA",
  dj: "#FB7185",
};
