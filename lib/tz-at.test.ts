import assert from "node:assert/strict";
import test from "node:test";
import { timeZoneAt } from "./tz-at";
import { venueZoneLabel } from "./venue-time";

test("offline lookup names Mystic and Austin", () => {
  assert.equal(timeZoneAt(41.354266, -71.966462), "America/New_York");
  assert.equal(timeZoneAt(41.824, -71.4128), "America/New_York");
  assert.equal(timeZoneAt(30.2672, -97.7431), "America/Chicago");
  assert.equal(venueZoneLabel(timeZoneAt(41.354266, -71.966462)), "ET");
  assert.equal(venueZoneLabel(timeZoneAt(30.2672, -97.7431)), "CT");
});

test("invalid coordinates and oceans do not invent a zone", () => {
  assert.equal(timeZoneAt(Number.NaN, -71.9), null);
  assert.equal(timeZoneAt(91, 0), null);
  assert.equal(timeZoneAt(0, 181), null);
  assert.equal(timeZoneAt(0, -30), null);
});
