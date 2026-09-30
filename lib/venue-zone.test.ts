import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { formatGigWhen, gigMatchesVenueDate, localDateKey, toVenueDateTimeLocal } from "./venue-time";
import { parseVenueDateTimeLocal } from "./venue-instant";
import {
  isVenueTimeZoneName,
  lookupVenueTimeZone,
  planTimezoneBackfill,
  readStoredSource,
  readStoredTimeZone,
} from "./venue-zone";

const here = fileURLToPath(import.meta.url);
const root = process.cwd();

test("posting a gig derives the zone and does not read one from the client", () => {
  const action = readFileSync(path.join(root, "app/actions/gigs.ts"), "utf8");
  assert.match(action, /lookupVenueTimeZone\(\s*lat\s*,\s*lng\s*\)/);
  assert.match(action, /parseVenueDateTimeLocal\(\s*datetimeLocal\s*,\s*timezone\s*\)/);
  assert.doesNotMatch(action, /formData\.get\(\s*["']time(?:zone|Zone)["']\s*\)/);

  for (const relative of ["lib/repo/supabase.ts", "lib/repo/json.ts"]) {
    const source = readFileSync(path.join(root, relative), "utf8");
    assert.match(source, /lookupVenueTimeZone\(/);
    assert.doesNotMatch(source, /input\.timezone/);
  }

  const backfill = readFileSync(path.join(root, "scripts/backfill-gig-timezones.ts"), "utf8");
  assert.match(backfill, /planTimezoneBackfill/);
  assert.match(backfill, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(backfill, /SUPABASE_ANON_KEY|NEXT_PUBLIC_SUPABASE_ANON_KEY/);

  for (const relative of [
    "components/Discovery.tsx",
    "components/GigMap.tsx",
    "app/gigs/[id]/page.tsx",
    "app/performers/[id]/page.tsx",
  ]) {
    const source = readFileSync(path.join(root, relative), "utf8");
    assert.match(source, /gig\.timezone/);
    assert.doesNotMatch(source, /formatGigWhen\(gig\.datetime\)/);
    assert.doesNotMatch(source, /formatGigDay\(gig\.datetime\)/);
    assert.doesNotMatch(source, /localDateKey\(gig\.datetime\)/);
  }

  for (const file of [...walk(path.join(root, "components")), ...walk(path.join(root, "app"))]) {
    const source = readFileSync(file, "utf8");
    if (!source.includes('"use client"') && !source.includes("'use client'")) continue;
    assert.doesNotMatch(source, /venue-zone|tz-lookup/, path.relative(root, file));
  }
});

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) out.push(full);
  }
  return out;
}

if (process.env.VENUE_ZONE_TZ_CHILD === "1") {
  runChecks();
} else {
  test("zone lookup and 9pm round-trip do not depend on the host timezone", () => {
    for (const tz of ["UTC", "Asia/Tokyo"]) {
      const result = spawnSync(process.execPath, ["--import", "tsx", here], {
        cwd: root,
        env: { ...process.env, TZ: tz, VENUE_ZONE_TZ_CHILD: "1" },
        encoding: "utf8",
      });
      assert.equal(result.status, 0, `TZ=${tz}\n${result.stdout}\n${result.stderr}`);
    }
  });
}

function runChecks() {
  const host = Intl.DateTimeFormat().resolvedOptions().timeZone;
  assert.equal(host, process.env.TZ, `expected host zone ${process.env.TZ}, got ${host}`);

  assert.equal(isVenueTimeZoneName("America/Chicago"), true);
  assert.equal(isVenueTimeZoneName("America/New_York"), true);
  assert.equal(isVenueTimeZoneName("America/Indiana/Indianapolis"), true);
  assert.equal(isVenueTimeZoneName("Etc/GMT"), false);
  assert.equal(isVenueTimeZoneName("EST"), false);
  assert.equal(isVenueTimeZoneName("UTC"), false);

  assert.equal(lookupVenueTimeZone(30.2672, -97.7431), "America/Chicago");
  assert.equal(lookupVenueTimeZone(30.2661, -97.7396), "America/Chicago");
  assert.equal(lookupVenueTimeZone(41.3542, -71.9661), "America/New_York");
  assert.equal(lookupVenueTimeZone(41.351009, -71.97215), "America/New_York");
  assert.equal(lookupVenueTimeZone(41.471846, -71.959769), "America/New_York");

  // LaPorte County (Central) and New Carlisle in St. Joseph County (Eastern),
  // about 10 km apart across the northern Indiana line.
  assert.equal(lookupVenueTimeZone(41.6706, -86.6192), "America/Chicago");
  assert.equal(lookupVenueTimeZone(41.7042, -86.5056), "America/Indiana/Indianapolis");

  assert.throws(() => lookupVenueTimeZone(0, 0), /pin on the venue/);
  assert.throws(() => lookupVenueTimeZone(91, 0), /pin on the venue/);

  const zones = [
    ["America/Chicago", "2026-10-31T21:00", "2026-11-01T02:00:00.000Z", "2026-11-01T21:00", "2026-11-02T03:00:00.000Z"],
    ["America/New_York", "2026-10-31T21:00", "2026-11-01T01:00:00.000Z", "2026-11-01T21:00", "2026-11-02T02:00:00.000Z"],
    [
      "America/Indiana/Indianapolis",
      "2026-10-31T21:00",
      "2026-11-01T01:00:00.000Z",
      "2026-11-01T21:00",
      "2026-11-02T02:00:00.000Z",
    ],
  ] as const;

  for (const [zone, beforeLocal, beforeUtc, afterLocal, afterUtc] of zones) {
    const before = parseVenueDateTimeLocal(beforeLocal, zone);
    const after = parseVenueDateTimeLocal(afterLocal, zone);
    assert.equal(before, beforeUtc, zone);
    assert.equal(after, afterUtc, zone);
    assert.equal(toVenueDateTimeLocal(before, zone), beforeLocal);
    assert.equal(toVenueDateTimeLocal(after, zone), afterLocal);
    assert.match(formatGigWhen(after, zone), /\bNov 1\b/);
    assert.match(formatGigWhen(after, zone), /9:00\s*PM/);
    assert.equal(localDateKey(after, zone), "2026-11-01");
  }

  const late = "2026-11-02T05:30:00.000Z";
  assert.equal(localDateKey(late, "America/Chicago"), "2026-11-01");
  assert.equal(localDateKey(late, "America/New_York"), "2026-11-02");
  assert.equal(gigMatchesVenueDate(late, "2026-11-01", new Date("2026-11-02T18:00:00.000Z"), "America/Chicago"), true);
  assert.equal(gigMatchesVenueDate(late, "2026-11-01", new Date("2026-11-02T18:00:00.000Z"), "America/New_York"), false);

  const plan = planTimezoneBackfill([
    { id: "austin", lat: 30.2672, lng: -97.7431, timezone: null },
    { id: "foxwoods", lat: 41.471846, lng: -71.959769, timezone: null },
    { id: "mystic", lat: 41.351009, lng: -71.97215, timezone: null },
    { id: "boundary-central", lat: 41.6706, lng: -86.6192, timezone: null },
    { id: "boundary-eastern", lat: 41.7042, lng: -86.5056, timezone: null },
    { id: "kept", lat: 30.2672, lng: -97.7431, timezone: "America/New_York" },
  ]);
  assert.deepEqual(
    plan,
    [
      { id: "austin", timezone: "America/Chicago" },
      { id: "foxwoods", timezone: "America/New_York" },
      { id: "mystic", timezone: "America/New_York" },
      { id: "boundary-central", timezone: "America/Chicago" },
      { id: "boundary-eastern", timezone: "America/Indiana/Indianapolis" },
    ],
  );

  assert.equal(readStoredTimeZone(null, 30.2672, -97.7431), "America/Chicago");
  assert.equal(readStoredTimeZone("America/New_York", 30.2672, -97.7431), "America/New_York");
  assert.equal(readStoredTimeZone("EST", 41.3542, -71.9661), "America/New_York");
  assert.deepEqual(readStoredSource("public_info", "https://example.com/show"), {
    sourceKind: "public_info",
    sourceUrl: "https://example.com/show",
  });
  assert.deepEqual(readStoredSource("public_info", null), { sourceKind: null, sourceUrl: null });
  assert.deepEqual(readStoredSource(null, null), { sourceKind: null, sourceUrl: null });
  assert.deepEqual(readStoredSource("owner", null), { sourceKind: "owner", sourceUrl: null });
}
