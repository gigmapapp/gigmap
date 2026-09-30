import assert from "node:assert/strict";
import test from "node:test";
import { zoneForGig } from "./gig-zone";
import { formatGigWhen, gigMatchesVenueDate, localDateKey } from "./venue-time";

/** Stubb's wall clock: 8:00 PM CDT, stored as an offset instant with no zone. */
const patio = "2026-10-02T20:00:00-05:00";
const stubbs = { lat: 30.2685, lng: -97.7362 };

test("a gig with no stored zone uses the pin, so Austin reads Central Time", () => {
  const zone = zoneForGig({ timezone: null, location: stubbs });
  assert.equal(zone, "America/Chicago");
  const label = formatGigWhen(patio, zone);
  assert.match(label, /8:00\s*PM/);
  assert.match(label, /\bCT$/);
  assert.doesNotMatch(label, /\bET\b|EDT|CDT/);
  assert.equal(localDateKey(patio, zone), "2026-10-02");

  assert.equal(zoneForGig({ location: stubbs }), "America/Chicago");
  assert.equal(zoneForGig({ timezone: "", location: stubbs }), "America/Chicago");
  assert.equal(zoneForGig({ timezone: "Not/AZone", location: stubbs }), "America/Chicago");
});

test("a missing pin falls back to Eastern Time, and a stored zone wins", () => {
  const noPin = zoneForGig({ timezone: undefined, location: null });
  assert.equal(noPin, "America/New_York");
  const eastern = formatGigWhen(patio, noPin);
  assert.match(eastern, /9:00\s*PM/);
  assert.match(eastern, /\bET$/);

  assert.equal(zoneForGig({ location: { lat: Number.NaN, lng: -97.7 } }), "America/New_York");
  assert.equal(zoneForGig({ location: { lat: 0, lng: -30 } }), "America/New_York");

  const stored = zoneForGig({
    timezone: "America/Los_Angeles",
    location: stubbs,
  });
  assert.equal(stored, "America/Los_Angeles");
  assert.match(formatGigWhen(patio, stored), /\bPT$/);
});

test("date filters follow the pin zone when no zone is stored", () => {
  // 11:30 PM in Austin is already the next calendar day in New York.
  const late = "2026-10-02T23:30:00-05:00";
  const gig = { timezone: null, location: stubbs };
  const zone = zoneForGig(gig);
  assert.equal(localDateKey(late, zone), "2026-10-02");
  assert.equal(localDateKey(late, zoneForGig({ location: null })), "2026-10-03");
  assert.equal(gigMatchesVenueDate(late, "2026-10-02", new Date("2026-10-01T12:00:00.000Z"), zone), true);
  assert.equal(gigMatchesVenueDate(late, "2026-10-03", new Date("2026-10-01T12:00:00.000Z"), zone), false);
});
