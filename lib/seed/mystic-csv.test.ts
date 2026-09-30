import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { mysticSeed } from "./database";
import { publicListingsFromCsv } from "./mystic-csv";
import { toVenueDateTimeLocal } from "../venue-time";
import { lookupVenueTimeZone } from "../venue-zone";

const here = fileURLToPath(import.meta.url);

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

  const seed = mysticSeed();
  assert.equal(seed.performers.length, 8);
  assert.equal(seed.gigs.length, 8);
  assert.equal(new Set(seed.performers.map((performer) => performer.id)).size, 8);
  assert.equal(new Set(seed.gigs.map((gig) => gig.id)).size, 8);
  assert.deepEqual(
    seed.performers.map((performer) => performer.id).sort(),
    [
      "a-j-croce",
      "a-vibe-the-encore-2000s-party",
      "dj-blade-mon",
      "hubby-jenkins",
      "monophonics",
      "ramblin-dan-stevens",
      "the-cartells",
      "violet-theory",
    ],
  );

  const dumped = JSON.stringify(seed);
  assert.doesNotMatch(dumped, /straight-line|time approximate|Category guessed|Wailing City/);

  for (const gig of seed.gigs) {
    assert.equal(gig.sourceKind, "public_info");
    assert.match(gig.sourceUrl, /^https:\/\/\S+$/);
    assert.equal(gig.description, "");
    assert.equal(gig.timezone, "America/New_York");
    assert.equal(gig.timezone, lookupVenueTimeZone(gig.location.lat, gig.location.lng));
    assert.match(gig.id, /^[a-z0-9]+(-[a-z0-9]+)*$/);
    assert.ok(gig.id.length <= 80);
    const performer = seed.performers.find((item) => item.id === gig.performerId);
    assert.ok(performer);
    assert.equal(performer.videos.length, 0);
    assert.deepEqual(performer.genres, []);
    assert.equal(gig.title, performer.name);
    assert.equal(gig.category, performer.category);
    assert.match(performer.id, /^[a-z0-9]+(-[a-z0-9]+)*$/);
  }

  const monophonics = seed.gigs.find((gig) => gig.id === "monophonics-2026-10-03");
  assert.ok(monophonics);
  assert.equal(monophonics.datetime, "2026-10-04T00:00:00.000Z");
  assert.equal(toVenueDateTimeLocal(monophonics.datetime, monophonics.timezone), "2026-10-03T20:00");
  assert.match(monophonics.location.label, /Knick Music Lab/);
  assert.match(monophonics.location.label, /Westerly, RI/);
  assert.equal(
    seed.performers.find((performer) => performer.id === "monophonics")?.bio,
    "Psychedelic soul band (per United Theatre event page).",
  );
  assert.equal(seed.performers.find((performer) => performer.id === "monophonics")?.city, "Westerly, RI");

  const hubby = seed.gigs.find((gig) => gig.id === "hubby-jenkins-2026-11-14");
  assert.ok(hubby);
  assert.equal(hubby.datetime, "2026-11-15T01:00:00.000Z");
  assert.equal(toVenueDateTimeLocal(hubby.datetime, hubby.timezone), "2026-11-14T20:00");

  const cartells = seed.gigs.find((gig) => gig.id === "the-cartells-2026-10-03");
  assert.ok(cartells);
  assert.equal(cartells.datetime, "2026-10-03T22:00:00.000Z");
  assert.equal(cartells.category, "band");

  const vibe = seed.performers.find((performer) => performer.name.includes("VIBE"));
  assert.equal(vibe?.id, "a-vibe-the-encore-2000s-party");
  assert.equal(vibe?.category, "dj");
  assert.equal(vibe?.city, "New London, CT");
  const vibeGig = seed.gigs.find((gig) => gig.performerId === vibe?.id);
  assert.equal(vibeGig?.datetime, "2026-10-04T01:00:00.000Z");
  assert.match(vibeGig?.location.label ?? "", /Mambo Bar/);

  const croce = seed.performers.find((performer) => performer.id === "a-j-croce");
  assert.match(croce?.bio ?? "", /Croce's songs/);
  assert.equal(croce?.category, "solo");

  const austin = publicListingsFromCsv(
    [
      "performer_name,category,bio,venue_name,street_address,lat,lng,date,start_time_et,source_url,notes",
      'Test Act,Solo,A bio,Antone\'s,"305 E 5th St, Austin, TX 78701",30.2672,-97.7431,2026-11-01,21:00,https://example.com/austin,Listed from a page',
    ].join("\n"),
  );
  assert.equal(austin.gigs[0]?.timezone, "America/Chicago");
  assert.equal(austin.gigs[0]?.datetime, "2026-11-02T03:00:00.000Z");
  assert.equal(austin.gigs[0]?.description, "");
  assert.doesNotMatch(JSON.stringify(austin), /Listed from a page/);

  assert.throws(
    () =>
      publicListingsFromCsv(
        "performer_name,category,bio,venue_name,street_address,lat,lng,date,start_time_et,source_url,notes\nAct,Trio,Bio,Venue,\"1 Main St, Mystic, CT 06355\",41.35,-71.97,2026-10-02,20:00,https://example.com/a,Notes\n",
      ),
    /Unknown category/,
  );
}
