import assert from "node:assert/strict";
import test from "node:test";
import {
  MAP_ATTRIBUTION,
  loadVoyagerStyle,
  noteMapError,
  osmRasterStyle,
  voyagerRasterStyle,
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

function assertVoyagerRaster(style: StyleSpecification) {
  const source = style.sources.voyager;
  assert.ok(source);
  assert.equal(source.type, "raster");
  if (source.type !== "raster") return;
  assert.ok(source.tiles?.some((tile) => tile.includes("rastertiles/voyager")));
  assert.equal(source.attribution, MAP_ATTRIBUTION);
  assert.match(source.attribution ?? "", /carto\.com\/attributions/);
  assert.match(source.attribution ?? "", /openstreetmap\.org\/copyright/);
}

test("a valid Voyager stylesheet keeps its sources and the required attribution", async () => {
  const style = await loadVoyagerStyle({
    fetchImpl: async () => Response.json(vectorStyle),
  });
  const source = style.sources.carto;
  assert.equal(source?.type, "vector");
  if (source?.type === "vector") assert.equal(source.attribution, MAP_ATTRIBUTION);
});

test("reject, non-ok, bad JSON, and timeout fall back to CARTO raster tiles", async () => {
  const hang: VoyagerStyleLoader["fetchImpl"] = (_url, init) =>
    new Promise((_resolve, reject) => {
      const abort = () => reject(Object.assign(new Error("The operation was aborted"), { name: "AbortError" }));
      if (init?.signal?.aborted) abort();
      init?.signal?.addEventListener("abort", abort, { once: true });
    });

  const { warnings } = await warningsDuring(async () => {
    assertVoyagerRaster(await loadVoyagerStyle({ fetchImpl: async () => Promise.reject(new Error("offline")) }));
    assertVoyagerRaster(
      await loadVoyagerStyle({ fetchImpl: async () => new Response("nope", { status: 503 }) }),
    );
    assertVoyagerRaster(await loadVoyagerStyle({ fetchImpl: async () => new Response("{", { status: 200 }) }));
    assertVoyagerRaster(await loadVoyagerStyle({ fetchImpl: hang, timeoutMs: 20 }));
  });
  assert.equal(warnings.length, 1);
  assert.match(String(warnings[0]?.[0]), /CARTO raster tiles/);
});

test("CARTO raster tile errors switch to OSM once, and other errors do not", () => {
  const osm = osmRasterStyle();
  const osmSource = osm.sources.osm;
  assert.equal(osmSource?.type, "raster");
  if (osmSource?.type === "raster") {
    assert.ok(osmSource.tiles?.some((tile) => tile.includes("tile.openstreetmap.org")));
    assert.equal(osmSource.attribution, MAP_ATTRIBUTION);
  }

  const vector = vectorStyle;
  let vectorSets = 0;
  noteMapError(
    {
      getStyle: () => vector,
      setStyle: () => {
        vectorSets += 1;
      },
      once: () => {},
    },
    new Error("glyph failed"),
  );
  assert.equal(vectorSets, 0);

  let current = voyagerRasterStyle();
  let replacements = 0;
  const host = {
    getStyle: () => current,
    setStyle: (style: StyleSpecification) => {
      current = style;
    },
    once: (_type: "style.load", listener: () => void) => {
      replacements += 1;
      listener();
    },
  };
  const tileError = Object.assign(new Error("Failed to fetch"), {
    url: "https://a.basemaps.cartocdn.com/rastertiles/voyager/12/123/456.png",
  });
  noteMapError(host, tileError, () => {});
  assert.equal(replacements, 1);
  assert.equal(current.sources.osm?.type, "raster");
  noteMapError(host, tileError, () => {});
  assert.equal(replacements, 1);
});
