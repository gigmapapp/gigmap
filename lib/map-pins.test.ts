import assert from "node:assert/strict";
import test from "node:test";
import {
  CLUSTER_RADIUS_PX,
  MAP_ATTRIBUTION_CLEARANCE_PX,
  MAP_CONTROL_CLEARANCE_PX,
  MARKER_TAP_PX,
  mapViewPadding,
  maplibreWorkerUrl,
  pinsShareCoordinates,
  venuePinOffsets,
} from "./map-pins";

test("view padding clears the right-side controls and the attribution", () => {
  assert.equal(MAP_CONTROL_CLEARANCE_PX, 60);
  assert.ok(MAP_ATTRIBUTION_CLEARANCE_PX >= 28);
  assert.ok(CLUSTER_RADIUS_PX >= MARKER_TAP_PX);

  for (const width of [320, 375, 390, 414, 1280]) {
    for (const height of [220, 320, 568, 664, 800]) {
      const pad = mapViewPadding(width, height);
      assert.ok(pad.right >= Math.min(MAP_CONTROL_CLEARANCE_PX, height * 0.4), `${width}x${height} right`);
      assert.ok(pad.bottom >= Math.min(MAP_ATTRIBUTION_CLEARANCE_PX, height * 0.4), `${width}x${height} bottom`);
      assert.ok(pad.top >= 0 && pad.left >= 0);
      assert.ok(pad.top + pad.bottom < height, `${width}x${height} vertical`);
      assert.ok(pad.left + pad.right < width, `${width}x${height} horizontal`);
    }
  }

  const phone = mapViewPadding(375, 664);
  assert.equal(phone.right, 60);
  assert.ok(phone.bottom >= MAP_ATTRIBUTION_CLEARANCE_PX);
  assert.ok(phone.top < mapViewPadding(1280, 800).top);
});

test("same-venue pins are offset by at least a tap target", () => {
  const shared = { lng: -71.97215, lat: 41.351009 };
  const offsets = venuePinOffsets([
    { id: "blade", ...shared },
    { id: "dan", ...shared },
  ]);
  const blade = offsets.get("blade");
  const dan = offsets.get("dan");
  assert.ok(blade && dan);
  const distance = Math.hypot(blade.x - dan.x, blade.y - dan.y);
  assert.ok(distance >= MARKER_TAP_PX, `distance ${distance}`);
  assert.notDeepEqual(blade, dan);

  const alone = venuePinOffsets([{ id: "solo", lng: -71.82, lat: 41.38 }]);
  assert.deepEqual(alone.get("solo"), { x: 0, y: 0 });

  const separate = venuePinOffsets([
    { id: "a", lng: -72.1, lat: 41.35 },
    { id: "b", lng: -71.8, lat: 41.38 },
  ]);
  assert.deepEqual(separate.get("a"), { x: 0, y: 0 });
  assert.deepEqual(separate.get("b"), { x: 0, y: 0 });
});

test("three pins on one venue stay on a ring at least 44px apart", () => {
  const offsets = venuePinOffsets([
    { id: "c", lng: 1, lat: 2 },
    { id: "a", lng: 1, lat: 2 },
    { id: "b", lng: 1.000004, lat: 2 },
  ]);
  const placed = ["a", "b", "c"].map((id) => offsets.get(id));
  assert.equal(placed.length, 3);
  for (let i = 0; i < placed.length; i++) {
    for (let j = i + 1; j < placed.length; j++) {
      const left = placed[i];
      const right = placed[j];
      assert.ok(left && right);
      const distance = Math.hypot(left.x - right.x, left.y - right.y);
      assert.ok(distance >= MARKER_TAP_PX, `${i}-${j} ${distance}`);
    }
  }
});

test("identical coordinates cannot be separated by zooming", () => {
  const venue = { lng: -72.099024, lat: 41.35543 };
  assert.equal(pinsShareCoordinates([venue, { ...venue }, { ...venue }]), true);
  assert.equal(
    pinsShareCoordinates([venue, { lng: venue.lng + 0.01, lat: venue.lat }]),
    false,
  );
  assert.equal(pinsShareCoordinates([venue]), true);
});

test("worker URL points at the served module script", () => {
  const url = maplibreWorkerUrl("http://localhost:3000");
  assert.equal(url, "http://localhost:3000/maplibre/maplibre-gl-worker.mjs");
  assert.notEqual(url, "");
  assert.equal(maplibreWorkerUrl("https://gigmap.example/"), "https://gigmap.example/maplibre/maplibre-gl-worker.mjs");
});
