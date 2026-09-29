import assert from "node:assert/strict";
import test from "node:test";
import { seedDatabase, SEED_GIGS, SEED_PERFORMERS } from "./austin";
import { austinDateTime } from "./time";

test("Chicago wall clock keeps the venue hour", () => {
  const summer = new Date("2026-09-29T18:00:00.000Z");
  const evening = austinDateTime(1, 21, 30, summer);
  assert.equal(new Date(evening).toISOString(), "2026-10-01T02:30:00.000Z");
  assert.match(evening, /T21:30:00-05:00$/);

  const winter = new Date("2026-01-15T18:00:00.000Z");
  const winterEvening = austinDateTime(1, 21, 30, winter);
  assert.equal(new Date(winterEvening).toISOString(), "2026-01-17T03:30:00.000Z");
  assert.match(winterEvening, /T21:30:00-06:00$/);
});

test("seed gigs run from just after now through about six weeks", () => {
  const now = new Date("2026-09-29T15:00:00.000Z");
  const db = seedDatabase(now);
  assert.equal(SEED_PERFORMERS.length, 10);
  assert.equal(db.performers.length, 10);
  assert.equal(SEED_GIGS.length, 12);
  assert.equal(db.gigs.length, 12);
  assert.equal(db.bookings.length, 0);
  assert.equal(db.performers.reduce((count, performer) => count + performer.videos.length, 0), 18);

  const times = db.gigs.map((gig) => new Date(gig.datetime).getTime()).sort((a, b) => a - b);
  assert.ok(times[0]! > now.getTime());
  const spanDays = (times[times.length - 1]! - times[0]!) / 86_400_000;
  assert.ok(spanDays >= 35 && spanDays <= 45, `span ${spanDays}`);
  assert.ok(times[times.length - 1]! < now.getTime() + 46 * 86_400_000);
});
