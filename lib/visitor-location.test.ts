import assert from "node:assert/strict";
import test from "node:test";
import { MYSTIC_CENTER } from "./map-style";
import {
  mapCenterForVisitor,
  requestVisitorLocation,
  VISITOR_LOCATION_TIMEOUT_MS,
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
