import assert from "node:assert/strict";
import test from "node:test";
import {
  CLUSTER_RADIUS_PX,
  MAP_ATTRIBUTION_CLEARANCE_PX,
  MAP_CONTROL_CLEARANCE_PX,
  MARKER_EDGE_CLEARANCE_PX,
  MARKER_TAP_PX,
  POPUP_FIT_PADDING,
  MAP_OVERLAY_GAP_PX,
  mapViewPadding,
  maplibreWorkerUrl,
  overlayTopPadding,
  pinsShareCoordinates,
  popupContentMaxHeight,
  popupPanBy,
  venuePinOffsets,
} from "./map-pins";

test("view padding clears the right-side controls and the attribution", () => {
  assert.equal(MAP_CONTROL_CLEARANCE_PX, 60);
  assert.equal(MARKER_EDGE_CLEARANCE_PX, MARKER_TAP_PX / 2 + 12);
  assert.ok(MAP_ATTRIBUTION_CLEARANCE_PX >= 28);
  assert.ok(CLUSTER_RADIUS_PX >= MARKER_TAP_PX);
  assert.ok(POPUP_FIT_PADDING.bottom > POPUP_FIT_PADDING.top);

  for (const width of [320, 375, 390, 414, 1280]) {
    for (const height of [220, 320, 568, 664, 800]) {
      const pad = mapViewPadding(width, height);
      assert.ok(pad.right >= Math.min(MAP_CONTROL_CLEARANCE_PX, height * 0.4), `${width}x${height} right`);
      assert.ok(pad.bottom >= Math.min(MAP_ATTRIBUTION_CLEARANCE_PX, height * 0.4), `${width}x${height} bottom`);
      assert.ok(pad.left >= Math.min(MARKER_EDGE_CLEARANCE_PX, height * 0.4), `${width}x${height} left`);
      assert.ok(pad.top >= Math.min(MARKER_EDGE_CLEARANCE_PX, height * 0.4), `${width}x${height} top`);
      assert.ok(pad.top + pad.bottom < height, `${width}x${height} vertical`);
      assert.ok(pad.left + pad.right < width, `${width}x${height} horizontal`);
    }
  }

  const phone = mapViewPadding(375, 664);
  assert.equal(phone.right, 60);
  assert.equal(phone.left, MARKER_EDGE_CLEARANCE_PX);
  assert.equal(phone.top, MARKER_EDGE_CLEARANCE_PX);
  assert.ok(phone.bottom >= MAP_ATTRIBUTION_CLEARANCE_PX);
  assert.ok(phone.top < mapViewPadding(1280, 800).top);

  for (const width of [320, 375, 414]) {
    const pad = mapViewPadding(width, 227);
    assert.ok(pad.left >= MARKER_EDGE_CLEARANCE_PX);
    assert.ok(pad.top >= MARKER_EDGE_CLEARANCE_PX);
    assert.ok(pad.bottom >= MARKER_EDGE_CLEARANCE_PX);
    assert.ok(pad.right >= MAP_CONTROL_CLEARANCE_PX);
  }
});

test("popup pan keeps the card inside the map and prefers the popup over a pin that will not fit", () => {
  const map = { left: 0, top: 0, right: 320, bottom: 220 };
  const above = popupPanBy(map, { left: 40, top: -30, right: 200, bottom: 80 }, null);
  assert.deepEqual(above, [0, -(POPUP_FIT_PADDING.top - -30)]);

  const below = popupPanBy(map, { left: 40, top: 160, right: 200, bottom: 250 }, null);
  assert.ok(below);
  assert.equal(below[0], 0);
  assert.equal(below[1], 250 - (220 - POPUP_FIT_PADDING.bottom));

  const inside = popupPanBy(map, { left: 40, top: 40, right: 200, bottom: 120 }, null);
  assert.equal(inside, null);

  const underOverlay = popupPanBy(
    { left: 0, top: 100, right: 1280, bottom: 800 },
    { left: 400, top: 120, right: 640, bottom: 280 },
    null,
    { ...POPUP_FIT_PADDING, top: overlayTopPadding(100, 280) },
  );
  assert.ok(underOverlay);
  assert.equal(underOverlay[0], 0);
  assert.equal(underOverlay[1], -(280 + MAP_OVERLAY_GAP_PX - 120));
  assert.equal(overlayTopPadding(100, null), POPUP_FIT_PADDING.top);
  assert.equal(overlayTopPadding(100, 90), POPUP_FIT_PADDING.top);

  const pinTooTall = popupPanBy(
    map,
    { left: 40, top: 20, right: 200, bottom: 140 },
    { left: 80, top: 150, right: 124, bottom: 240 },
  );
  assert.equal(pinTooTall, null);
});

test("narrow maps cap popup content so the card can scroll", () => {
  const phone = popupContentMaxHeight(320, 227);
  assert.ok(phone != null && phone >= MARKER_TAP_PX);
  assert.ok(phone < 227);
  assert.equal(popupContentMaxHeight(1280, 800), null);
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
