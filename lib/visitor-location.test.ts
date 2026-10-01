import assert from "node:assert/strict";
import test from "node:test";
import { MYSTIC_CENTER } from "./map-style";
import {
  FAR_FROM_GIGS_HINT,
  GEO_ASKED_KEY,
  GEO_POSITION_KEY,
  cameraForVisitorFix,
  locateVisitorForVisit,
  mapCenterForVisitor,
  readGeolocationPermission,
  requestVisitorLocation,
  VISITOR_LOCATION_TIMEOUT_MS,
  type GeoFlagStore,
  type GeolocationPermissionSource,
  type VisitorGeoMemory,
  type VisitorGeolocation,
} from "./visitor-location";

const PERMISSION_DENIED = 1;
const TIMEOUT = 3;
const POSITION_UNAVAILABLE = 2;

function fakeGeo(
  impl: VisitorGeolocation["getCurrentPosition"],
): VisitorGeolocation {
  return { getCurrentPosition: impl };
}

test("granted returns coordinates and does not ask for a cached fix", async () => {
  let options: PositionOptions | undefined;
  const result = await requestVisitorLocation(
    fakeGeo((success, _error, opts) => {
      options = opts;
      success({ coords: { latitude: 41.824, longitude: -71.4128 } });
    }),
  );
  assert.deepEqual(result, { status: "granted", lat: 41.824, lng: -71.4128 });
  assert.equal(options?.enableHighAccuracy, false);
  assert.equal(options?.timeout, VISITOR_LOCATION_TIMEOUT_MS);
  assert.equal(options?.timeout, 5_000);
  assert.equal(options?.maximumAge, 0);
  assert.deepEqual(mapCenterForVisitor(result), {
    lat: 41.824,
    lng: -71.4128,
    zoom: MYSTIC_CENTER.zoom,
  });
});

test("permission denied stays on Mystic", async () => {
  const result = await requestVisitorLocation(
    fakeGeo((_success, error) => {
      error?.({ code: PERMISSION_DENIED });
    }),
  );
  assert.deepEqual(result, { status: "denied" });
  assert.deepEqual(mapCenterForVisitor(result), {
    lat: MYSTIC_CENTER.lat,
    lng: MYSTIC_CENTER.lng,
    zoom: MYSTIC_CENTER.zoom,
  });
});

test("timeout stays on Mystic", async () => {
  const result = await requestVisitorLocation(
    fakeGeo((_success, error) => {
      error?.({ code: TIMEOUT });
    }),
  );
  assert.deepEqual(result, { status: "timeout" });
  assert.equal(mapCenterForVisitor(result).lat, MYSTIC_CENTER.lat);
});

test("other geolocation errors are treated as denied", async () => {
  const result = await requestVisitorLocation(
    fakeGeo((_success, error) => {
      error?.({ code: POSITION_UNAVAILABLE });
    }),
  );
  assert.deepEqual(result, { status: "denied" });
});

test("missing, throwing, and non-finite geolocation are unsupported", async () => {
  assert.deepEqual(await requestVisitorLocation(null), { status: "unsupported" });
  assert.deepEqual(await requestVisitorLocation(undefined), { status: "unsupported" });
  assert.deepEqual(
    await requestVisitorLocation({ getCurrentPosition: undefined as never }),
    { status: "unsupported" },
  );
  assert.deepEqual(
    await requestVisitorLocation(
      fakeGeo(() => {
        throw new Error("blocked");
      }),
    ),
    { status: "unsupported" },
  );
  assert.deepEqual(
    await requestVisitorLocation(
      fakeGeo((success) => {
        success({ coords: { latitude: Number.NaN, longitude: -71.9 } });
      }),
    ),
    { status: "unsupported" },
  );
  assert.equal(mapCenterForVisitor({ status: "unsupported" }).lng, MYSTIC_CENTER.lng);
});

const mysticGig = [{ location: { lat: MYSTIC_CENTER.lat, lng: MYSTIC_CENTER.lng } }];
const providence = { lat: 41.824, lng: -71.4128 };
const austin = { lat: 30.2672, lng: -97.7431 };

function memoryStorage(initial: Record<string, string> = {}): GeoFlagStore & { dump: Map<string, string> } {
  const dump = new Map(Object.entries(initial));
  return {
    dump,
    getItem: (key) => (dump.has(key) ? dump.get(key)! : null),
    setItem: (key, value) => {
      dump.set(key, value);
    },
  };
}

function freshMemory(over: Partial<VisitorGeoMemory> = {}): VisitorGeoMemory {
  return { asked: false, position: null, ...over };
}

function permissions(state: "granted" | "denied" | "prompt" | "throws"): GeolocationPermissionSource {
  return {
    query: async (descriptor) => {
      assert.deepEqual(descriptor, { name: "geolocation" });
      if (state === "throws") throw new Error("Permissions unsupported");
      return { state };
    },
  };
}

test("granted locates silently and does not set the asked flag", async () => {
  const storage = memoryStorage();
  let calls = 0;
  const outcome = await locateVisitorForVisit({
    permissions: permissions("granted"),
    geolocation: fakeGeo((success, _error, options) => {
      calls += 1;
      assert.equal(options?.timeout, 5_000);
      success({ coords: { latitude: providence.lat, longitude: providence.lng } });
    }),
    storage,
    memory: freshMemory({ asked: true }),
    gigs: mysticGig,
  });
  assert.equal(calls, 1);
  assert.equal(storage.dump.has(GEO_ASKED_KEY), false);
  assert.equal(outcome.calledGetCurrentPosition, true);
  assert.equal(outcome.showFarHint, false);
  assert.equal(outcome.camera.lat, providence.lat);
  assert.equal(outcome.camera.zoom, MYSTIC_CENTER.zoom);
});

test("denied never calls getCurrentPosition and stays on Mystic", async () => {
  let calls = 0;
  const outcome = await locateVisitorForVisit({
    permissions: permissions("denied"),
    geolocation: fakeGeo(() => {
      calls += 1;
    }),
    storage: memoryStorage(),
    memory: freshMemory(),
    gigs: mysticGig,
  });
  assert.equal(calls, 0);
  assert.equal(outcome.calledGetCurrentPosition, false);
  assert.equal(outcome.showFarHint, false);
  assert.equal(outcome.camera.lat, MYSTIC_CENTER.lat);
  assert.equal(outcome.camera.lng, MYSTIC_CENTER.lng);
});

test("prompt asks once, sets the session flag, then reuses the stored fix", async () => {
  const storage = memoryStorage();
  const memory = freshMemory();
  let calls = 0;
  const first = await locateVisitorForVisit({
    permissions: permissions("prompt"),
    geolocation: fakeGeo((success) => {
      calls += 1;
      assert.equal(storage.dump.get(GEO_ASKED_KEY), "1");
      success({ coords: { latitude: providence.lat, longitude: providence.lng } });
    }),
    storage,
    memory,
    gigs: mysticGig,
  });
  assert.equal(calls, 1);
  assert.equal(memory.asked, true);
  assert.equal(first.camera.lat, providence.lat);
  assert.match(storage.dump.get(GEO_POSITION_KEY) ?? "", /41\.824/);

  const second = await locateVisitorForVisit({
    permissions: permissions("prompt"),
    geolocation: fakeGeo(() => {
      calls += 1;
    }),
    storage,
    memory: freshMemory(),
    gigs: mysticGig,
  });
  assert.equal(calls, 1);
  assert.equal(second.calledGetCurrentPosition, false);
  assert.equal(second.camera.lat, providence.lat);
  assert.equal(second.showFarHint, false);
});

test("a prompt flag that is already set skips getCurrentPosition", async () => {
  let calls = 0;
  const outcome = await locateVisitorForVisit({
    permissions: permissions("prompt"),
    geolocation: fakeGeo(() => {
      calls += 1;
    }),
    storage: memoryStorage({
      [GEO_ASKED_KEY]: "1",
      [GEO_POSITION_KEY]: JSON.stringify(providence),
    }),
    memory: freshMemory(),
    gigs: mysticGig,
  });
  assert.equal(calls, 0);
  assert.equal(outcome.camera.lng, providence.lng);
});

test("an in-memory fix is reused when sessionStorage has no position", async () => {
  const outcome = await locateVisitorForVisit({
    permissions: permissions("prompt"),
    geolocation: fakeGeo(() => {
      throw new Error("should not ask");
    }),
    storage: memoryStorage({ [GEO_ASKED_KEY]: "1" }),
    memory: freshMemory({ asked: true, position: providence }),
    gigs: mysticGig,
  });
  assert.equal(outcome.calledGetCurrentPosition, false);
  assert.equal(outcome.camera.lat, providence.lat);
});

test("Permissions unsupported uses the same asked flag", async () => {
  assert.equal(await readGeolocationPermission(null), "unsupported");
  assert.equal(await readGeolocationPermission(undefined), "unsupported");
  assert.equal(await readGeolocationPermission({}), "unsupported");
  assert.equal(await readGeolocationPermission(permissions("throws")), "unsupported");

  const storage = memoryStorage();
  let calls = 0;
  await locateVisitorForVisit({
    permissions: permissions("throws"),
    geolocation: fakeGeo((_success, error) => {
      calls += 1;
      assert.equal(storage.dump.get(GEO_ASKED_KEY), "1");
      error?.({ code: 1 });
    }),
    storage,
    memory: freshMemory(),
    gigs: mysticGig,
  });
  assert.equal(calls, 1);

  calls = 0;
  const skipped = await locateVisitorForVisit({
    permissions: null,
    geolocation: fakeGeo(() => {
      calls += 1;
    }),
    storage,
    memory: freshMemory(),
    gigs: mysticGig,
  });
  assert.equal(calls, 0);
  assert.equal(skipped.camera.lat, MYSTIC_CENTER.lat);
  assert.equal(skipped.showFarHint, false);
});

test("a fix farther than the nearest gig stays on Mystic and shows the hint", async () => {
  const storage = memoryStorage();
  const outcome = await locateVisitorForVisit({
    permissions: permissions("granted"),
    geolocation: fakeGeo((success) => {
      success({ coords: { latitude: austin.lat, longitude: austin.lng } });
    }),
    storage,
    memory: freshMemory(),
    gigs: mysticGig,
  });
  assert.equal(outcome.showFarHint, true);
  assert.equal(outcome.camera.lat, MYSTIC_CENTER.lat);
  assert.equal(outcome.camera.lng, MYSTIC_CENTER.lng);
  assert.equal(outcome.camera.zoom, MYSTIC_CENTER.zoom);
  assert.equal(FAR_FROM_GIGS_HINT, "No gigs near you yet. Showing Mystic, CT");
  const stored = JSON.parse(storage.dump.get(GEO_POSITION_KEY) ?? "{}") as { lat: number };
  assert.equal(stored.lat, austin.lat);
  assert.deepEqual(cameraForVisitorFix(null, mysticGig).showFarHint, false);
  assert.equal(cameraForVisitorFix(providence, mysticGig).showFarHint, false);
  assert.equal(cameraForVisitorFix(austin, []).showFarHint, true);
});

test("visitor location is session and memory only", async () => {
  const { readFileSync } = await import("node:fs");
  const source = [
    readFileSync(new URL("./visitor-location.ts", import.meta.url), "utf8"),
    readFileSync(new URL("../components/GigMap.tsx", import.meta.url), "utf8"),
  ].join("\n");
  assert.equal(source.includes("localStorage"), false);
  assert.equal(source.includes("GEO_ASKED_KEY = \"gigmap:geo-asked\""), true);
});
