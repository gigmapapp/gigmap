import assert from "node:assert/strict";
import test from "node:test";
import { distanceKm, gigsWithinRadius, NEARBY_RADIUS_KM } from "./nearby";

const mystic = { lat: 41.354266, lng: -71.966462 };
const providence = { lat: 41.824, lng: -71.4128 };
const austin = { lat: 30.2672, lng: -97.7431 };

test("nearby radius keeps Providence and drops Austin", () => {
  assert.equal(NEARBY_RADIUS_KM, 70);
  const toProvidence = distanceKm(mystic, providence);
  const toAustin = distanceKm(mystic, austin);
  assert.ok(toProvidence > 60 && toProvidence <= 70, `providence ${toProvidence}`);
  assert.ok(toAustin > 2000, `austin ${toAustin}`);

  const gigs = [
    { id: "providence", location: providence },
    { id: "austin", location: austin },
    { id: "mystic", location: mystic },
  ];
  assert.deepEqual(
    gigsWithinRadius(gigs, mystic).map((gig) => gig.id),
    ["providence", "mystic"],
  );
  assert.deepEqual(gigsWithinRadius([{ id: "austin", location: austin }], mystic), []);
  assert.equal(gigsWithinRadius(gigs, mystic, 60).some((gig) => gig.id === "providence"), false);
  assert.equal(gigsWithinRadius(gigs, providence).some((gig) => gig.id === "austin"), false);
});

test("a gig on the radius boundary is included", () => {
  const north = { lat: mystic.lat + (NEARBY_RADIUS_KM / 111.195), lng: mystic.lng };
  const distance = distanceKm(mystic, north);
  assert.ok(Math.abs(distance - NEARBY_RADIUS_KM) < 0.2, `distance ${distance}`);
  const inside = gigsWithinRadius([{ id: "edge", location: north }], mystic, distance);
  assert.equal(inside.length, 1);
  const outside = gigsWithinRadius([{ id: "edge", location: north }], mystic, distance - 0.5);
  assert.equal(outside.length, 0);
});
