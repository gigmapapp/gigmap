import assert from "node:assert/strict";
import test from "node:test";
import { clipObjectPath } from "./clips";

test("clip objects stay under the performer prefix", () => {
  const path = clipObjectPath("maya-chen", "mp4");
  assert.match(path, /^maya-chen\/[0-9a-f-]{36}\.mp4$/);
  assert.equal(path.includes(".."), false);
  assert.throws(() => clipObjectPath("../clips", "mp4"), /Unknown performer/);
  assert.throws(() => clipObjectPath("maya-chen", "exe"), /MP4/);
});
