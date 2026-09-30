import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { SEED_GIGS } from "./austin";
import { publicListingsFromCsv } from "./mystic-csv";
import { toVenueDateTimeLocal } from "../venue-time";
import { lookupVenueTimeZone } from "../venue-zone";

const here = fileURLToPath(import.meta.url);
const fixturePath = path.join(path.dirname(here), "fixtures", "mystic-gigs.csv");

if (process.env.MYSTIC_CSV_TZ_CHILD === "1") {
  runChecks();
} else {
  test("Mystic CSV transform does not depend on the host timezone", () => {
    for (const tz of ["UTC", "Asia/Tokyo"]) {
      const result = spawnSync(process.execPath, ["--import", "tsx", here], {
        cwd: process.cwd(),
        env: { ...process.env, TZ: tz, MYSTIC_CSV_TZ_CHILD: "1" },
        encoding: "utf8",
      });
      assert.equal(result.status, 0, `TZ=${tz}\n${result.stdout}\n${result.stderr}`);
    }
  });
}

function runChecks() {
  const host = Intl.DateTimeFormat().resolvedOptions().timeZone;
  assert.equal(host, process.env.TZ, `expected host zone ${process.env.TZ}, got ${host}`);

  const csv = readFileSync(fixturePath, "utf8");
  const seed = publicListingsFromCsv(csv);
  assert.equal(seed.gigs.length, 15);
  assert.equal(seed.performers.length, 15);
  assert.equal(SEED_GIGS.length, 12);
  assert.equal(new Set(seed.gigs.map((gig) => gig.id)).size, 15);
  assert.equal(new Set(seed.performers.map((performer) => performer.id)).size, 15);

  for (const gig of seed.gigs) {
    assert.equal(gig.sourceKind, "public_info");
    assert.match(gig.sourceUrl, /^https:\/\/\S+$/);
    assert.equal(gig.timezone, lookupVenueTimeZone(gig.location.lat, gig.location.lng));
    assert.equal(gig.timezone, "America/New_York");
    const performer = seed.performers.find((item) => item.id === gig.performerId);
    assert.ok(performer);
    assert.equal(performer.videos.length, 0);
    assert.equal(gig.title, performer.name);
  }

  const kc = seed.gigs.find((gig) => gig.id === "kc-and-the-sunshine-band-2026-10-02");
  assert.ok(kc);
  assert.equal(kc.category, "band");
  assert.equal(kc.datetime, "2026-10-02T23:30:00.000Z");
  assert.equal(toVenueDateTimeLocal(kc.datetime, kc.timezone), "2026-10-02T19:30");
  assert.equal(kc.sourceUrl, "https://www.foxwoods.com/event/kc-sunshine-band");
  assert.match(kc.location.label, /Foxwoods/);
  assert.match(kc.description, /Ticketed/);
  const kcPerformer = seed.performers.find((performer) => performer.id === kc.performerId);
  assert.equal(kcPerformer?.city, "Mashantucket, CT");
  assert.match(kcPerformer?.bio ?? "", /Get Down Tonight/);

  const mystic = seed.gigs.find((gig) => gig.id === "dj-blade-mon-2026-10-23");
  assert.ok(mystic);
  assert.equal(mystic.category, "dj");
  assert.equal(mystic.timezone, "America/New_York");
  assert.equal(mystic.location.lat, 41.351009);
  assert.equal(mystic.location.lng, -71.97215);

  const afterFallback = seed.gigs.find((gig) => gig.id === "hubby-jenkins-2026-11-14");
  assert.ok(afterFallback);
  assert.equal(afterFallback.datetime, "2026-11-15T01:00:00.000Z");
  assert.equal(toVenueDateTimeLocal(afterFallback.datetime, afterFallback.timezone), "2026-11-14T20:00");

  const westerly = seed.performers.find((performer) => performer.id === "monophonics");
  assert.equal(westerly?.city, "Westerly, RI");
  assert.equal(westerly?.category, "band");

  const austin = publicListingsFromCsv(
    [
      "performer_name,category,bio,venue_name,street_address,lat,lng,date,start_time_et,source_url,notes",
      'Test Act,Solo,A bio,Antone\'s,"305 E 5th St, Austin, TX 78701",30.2672,-97.7431,2026-11-01,21:00,https://example.com/austin,Listed from a page',
    ].join("\n"),
  );
  assert.equal(austin.gigs.length, 1);
  const austinGig = austin.gigs[0]!;
  assert.equal(austinGig.timezone, "America/Chicago");
  assert.equal(austinGig.datetime, "2026-11-02T03:00:00.000Z");
  assert.notEqual(austinGig.datetime, "2026-11-02T02:00:00.000Z");
  assert.equal(toVenueDateTimeLocal(austinGig.datetime, austinGig.timezone), "2026-11-01T21:00");
  assert.equal(austinGig.sourceKind, "public_info");
  assert.equal(austin.performers[0]?.city, "Austin, TX");
  assert.equal(austin.performers[0]?.category, "solo");

  assert.throws(
    () =>
      publicListingsFromCsv(
        "performer_name,category,bio,venue_name,street_address,lat,lng,date,start_time_et,source_url,notes\nAct,Trio,Bio,Venue,\"1 Main St, Mystic, CT 06355\",41.35,-71.97,2026-10-02,20:00,https://example.com/a,Notes\n",
      ),
    /Unknown category/,
  );
}
