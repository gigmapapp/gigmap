import assert from "node:assert/strict";
import test from "node:test";
import { gigClusterItemLabel, gigDisplayTitle, gigMarkerLabel } from "./gig-display";

test("equal title and performer collapse to the performer name", () => {
  assert.deepEqual(gigDisplayTitle("Ramblin' Dan Stevens", "Ramblin' Dan Stevens"), {
    primary: "Ramblin' Dan Stevens",
    secondary: null,
  });
  assert.equal(gigClusterItemLabel("Ramblin' Dan Stevens", "Ramblin' Dan Stevens"), "Ramblin' Dan Stevens");
  assert.equal(gigMarkerLabel("Ramblin' Dan Stevens", "Ramblin' Dan Stevens"), "Ramblin' Dan Stevens");
});

test("case differences still match and prefer the performer name", () => {
  assert.deepEqual(gigDisplayTitle("RAMBLIN' DAN STEVENS", "Ramblin' Dan Stevens"), {
    primary: "Ramblin' Dan Stevens",
    secondary: null,
  });
  assert.deepEqual(gigDisplayTitle("Ramblin' Dan Stevens", "ramblin' dan stevens"), {
    primary: "ramblin' dan stevens",
    secondary: null,
  });
});

test("extra spaces, curly apostrophes, and compatibility characters match", () => {
  assert.deepEqual(gigDisplayTitle("  Ramblin'   Dan    Stevens  ", "Ramblin' Dan Stevens"), {
    primary: "Ramblin' Dan Stevens",
    secondary: null,
  });
  assert.deepEqual(gigDisplayTitle("Ramblin\u2019 Dan Stevens", "Ramblin' Dan Stevens"), {
    primary: "Ramblin' Dan Stevens",
    secondary: null,
  });
  assert.deepEqual(gigDisplayTitle("Ramblin' Dan Stevens", "  Ramblin\u2019   Dan Stevens  "), {
    primary: "Ramblin\u2019   Dan Stevens",
    secondary: null,
  });
  assert.deepEqual(gigDisplayTitle("\uFF32amblin\u2019 Dan Stevens", "Ramblin' Dan Stevens"), {
    primary: "Ramblin' Dan Stevens",
    secondary: null,
  });
});

test("different title and performer keep both original strings", () => {
  assert.deepEqual(gigDisplayTitle("DJ Blade Mon Dance Party", "DJ Blade Mon"), {
    primary: "DJ Blade Mon Dance Party",
    secondary: "DJ Blade Mon",
  });
  assert.equal(
    gigClusterItemLabel("DJ Blade Mon Dance Party", "DJ Blade Mon"),
    "DJ Blade Mon — DJ Blade Mon Dance Party",
  );
  assert.equal(
    gigMarkerLabel("  Late set downtown  ", "DJ Blade Mon"),
    "  Late set downtown  , DJ Blade Mon",
  );
});

test("empty and missing title or performer stay graceful", () => {
  assert.deepEqual(gigDisplayTitle(null, undefined), { primary: "", secondary: null });
  assert.deepEqual(gigDisplayTitle("   ", ""), { primary: "", secondary: null });
  assert.deepEqual(gigDisplayTitle("Late set downtown", null), {
    primary: "Late set downtown",
    secondary: "",
  });
  assert.deepEqual(gigDisplayTitle("", "Ramblin' Dan Stevens"), {
    primary: "Ramblin' Dan Stevens",
    secondary: null,
  });
  assert.deepEqual(gigDisplayTitle(undefined, "   Ramblin' Dan Stevens  "), {
    primary: "Ramblin' Dan Stevens",
    secondary: null,
  });
  assert.equal(gigMarkerLabel(null, null), "Unknown");
  assert.equal(gigClusterItemLabel("Late set downtown", null), "Unknown — Late set downtown");
  assert.equal(gigClusterItemLabel("", ""), "Unknown");
  assert.equal(gigClusterItemLabel(null, "Ramblin' Dan Stevens"), "Ramblin' Dan Stevens");
});
