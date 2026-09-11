import type { StyleSpecification } from "@maplibre/maplibre-gl-style-spec";

export const AUSTIN_CENTER = {
  lng: -97.7431,
  lat: 30.2672,
  zoom: 12.35,
};

export const DARK_MAP_STYLE: StyleSpecification = {
  version: 8,
  name: "Carto Dark Matter",
  sources: {
    carto: {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
        "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
        "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
      ],
      tileSize: 256,
      attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
    },
  },
  layers: [
    {
      id: "carto-dark",
      type: "raster",
      source: "carto",
    },
  ],
};

export const CATEGORY_MARKER: Record<string, string> = {
  solo: "#F97316",
  band: "#FAFAFA",
  dj: "#FB7185",
};
