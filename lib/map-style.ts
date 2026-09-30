import { ACCENT } from "@/lib/accent";

/**
 * GNIS populated place for Mystic, Connecticut (41.354266°N, 71.966462°W).
 * Zoom matches the previous metro framing.
 */
export const MYSTIC_CENTER = {
  lng: -71.966462,
  lat: 41.354266,
  zoom: 12.35,
};

/** Keyless OSM raster tiles. Dark look is applied in CSS. */
export const DARK_MAP_STYLE = {
  version: 8 as const,
  name: "OpenStreetMap",
  sources: {
    osm: {
      type: "raster" as const,
      tiles: [
        "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "&copy; OpenStreetMap contributors",
    },
  },
  layers: [{ id: "osm", type: "raster" as const, source: "osm" }],
};

export const CATEGORY_MARKER: Record<string, string> = {
  solo: ACCENT,
  band: "#FAFAFA",
  dj: "#FB7185",
};
