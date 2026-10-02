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

let voyagerStylePromise: Promise<StyleSpecification> | null = null;

/** Fetches Voyager and stamps the required CARTO and OSM attribution. */
export function loadVoyagerStyle(): Promise<StyleSpecification> {
  if (!voyagerStylePromise) {
    voyagerStylePromise = fetch(VOYAGER_STYLE_URL)
      .then((response) => {
        if (!response.ok) throw new Error(`Voyager style ${response.status}`);
        return response.json() as Promise<StyleSpecification>;
      })
      .then((style) => attributeVoyagerStyle(undefined, style))
      .catch((error: unknown) => {
        voyagerStylePromise = null;
        throw error;
      });
  }
  return voyagerStylePromise;
}

export const CATEGORY_MARKER: Record<string, string> = {
  solo: ACCENT,
  band: "#FAFAFA",
  dj: "#FB7185",
};
