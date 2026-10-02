import assert from "node:assert/strict";
import test from "node:test";
import {
  MAP_ATTRIBUTION,
  OSM_ATTRIBUTION,
  loadVoyagerStyle,
  noteMapError,
  osmRasterStyle,
  type VoyagerStyleLoader,
} from "./map-style";
import type { StyleSpecification } from "maplibre-gl";

const vectorStyle = {
  version: 8,
  sources: {
    carto: { type: "vector", url: "https://example.com/tiles.json" },
  },
  layers: [],
} satisfies StyleSpecification;

function warningsDuring<T>(run: () => Promise<T>) {
  const warnings: unknown[][] = [];
  const original = console.warn;
  console.warn = (...args: unknown[]) => {
    warnings.push(args);
  };
  return run().finally(() => {
    console.warn = original;
  }).then((value) => ({ value, warnings }));
}

function assertOsmRaster(style: StyleSpecification) {
  const source = style.sources.osm;
  assert.ok(source);
  assert.equal(source.type, "raster");
  if (source.type !== "raster") return;
  assert.deepEqual(source.tiles, ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"]);
  assert.equal(source.tileSize, 256);
  assert.equal(source.maxzoom, 19);
  assert.equal(source.attribution, OSM_ATTRIBUTION);
  assert.match(source.attribution ?? "", /openstreetmap\.org\/copyright/);
  assert.doesNotMatch(source.attribution ?? "", /carto/i);
  assert.equal(style.sources.voyager, undefined);
}

test("a valid Voyager stylesheet keeps its sources and the required attribution", async () => {
  const style = await loadVoyagerStyle({
    fetchImpl: async () => Response.json(vectorStyle),
  });
  const source = style.sources.carto;
  assert.equal(source?.type, "vector");
  if (source?.type === "vector") assert.equal(source.attribution, MAP_ATTRIBUTION);
  assert.match(MAP_ATTRIBUTION, /carto\.com\/attributions/);
});

test("reject, non-ok, bad JSON, and timeout fall back to OSM raster tiles", async () => {
  const hang: VoyagerStyleLoader["fetchImpl"] = (_url, init) =>
    new Promise((_resolve, reject) => {
      const abort = () => reject(Object.assign(new Error("The operation was aborted"), { name: "AbortError" }));
      if (init?.signal?.aborted) abort();
      init?.signal?.addEventListener("abort", abort, { once: true });
    });

  const { warnings } = await warningsDuring(async () => {
    assertOsmRaster(await loadVoyagerStyle({ fetchImpl: async () => Promise.reject(new Error("offline")) }));
    assertOsmRaster(
      await loadVoyagerStyle({ fetchImpl: async () => new Response("nope", { status: 503 }) }),
    );
    assertOsmRaster(await loadVoyagerStyle({ fetchImpl: async () => new Response("{", { status: 200 }) }));
    assertOsmRaster(await loadVoyagerStyle({ fetchImpl: hang, timeoutMs: 20 }));
  });
  assert.equal(warnings.length, 1);
  assert.match(String(warnings[0]?.[0]), /OpenStreetMap tiles/);
  assertOsmRaster(osmRasterStyle());
});

test("map errors are logged once and do not replace the loaded style", () => {
  let sets = 0;
  const host = {
    getStyle: () => vectorStyle,
    setStyle: () => {
      sets += 1;
    },
    once: () => {},
  };
  noteMapError(host, new Error("glyph failed"));
  noteMapError(
    host,
    Object.assign(new Error("Failed to fetch"), {
      url: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
    }),
  );
  assert.equal(sets, 0);
});
