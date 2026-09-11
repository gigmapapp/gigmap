export const AUSTIN_CENTER = {
  lng: -97.7431,
  lat: 30.2672,
  zoom: 12.35,
};

/** OpenFreeMap dark vector style — no API key. */
export const DARK_MAP_STYLE = "https://tiles.openfreemap.org/styles/dark";

export const OSM_RASTER_FALLBACK = {
  version: 8 as const,
  name: "OSM raster",
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
  solo: "#F97316",
  band: "#FAFAFA",
  dj: "#FB7185",
};
