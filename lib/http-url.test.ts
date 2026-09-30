import assert from "node:assert/strict";
import test from "node:test";
import { safeHttpUrl } from "./http-url";

test("safeHttpUrl keeps http and https links", () => {
  assert.equal(safeHttpUrl("https://www.gardearts.org/events"), "https://www.gardearts.org/events");
  assert.equal(safeHttpUrl("  http://example.com/path  "), "http://example.com/path");
  assert.equal(safeHttpUrl("https://example.com/a?b=1&c=2"), "https://example.com/a?b=1&c=2");
  assert.equal(safeHttpUrl("HTTPS://Example.com/Show"), "https://example.com/Show");
});

test("safeHttpUrl rejects other schemes and junk", () => {
  assert.equal(safeHttpUrl("javascript:alert(1)"), null);
  assert.equal(safeHttpUrl("data:text/html,hi"), null);
  assert.equal(safeHttpUrl("ftp://example.com/file"), null);
  assert.equal(safeHttpUrl("/gigs/monophonics"), null);
  assert.equal(safeHttpUrl("not a url"), null);
  assert.equal(safeHttpUrl(""), null);
  assert.equal(safeHttpUrl("   "), null);
  assert.equal(safeHttpUrl(null), null);
  assert.equal(safeHttpUrl(undefined), null);
});
