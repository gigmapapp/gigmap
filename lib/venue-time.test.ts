import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  formatGigWhen,
  gigMatchesVenueDate,
  isUpcoming,
  localDateKey,
  toVenueDateTimeLocal,
} from "./venue-time";
import { parseVenueDateTimeLocal, startOfLocalDay } from "./venue-instant";

const here = fileURLToPath(import.meta.url);

if (process.env.VENUE_TIME_TZ_CHILD === "1") {
  runChecks();
} else {
  test("venue time does not depend on the host timezone", () => {
    for (const tz of ["UTC", "Asia/Tokyo", "America/Chicago"]) {
      const result = spawnSync(process.execPath, ["--import", "tsx", here], {
        cwd: process.cwd(),
        env: { ...process.env, TZ: tz, VENUE_TIME_TZ_CHILD: "1" },
        encoding: "utf8",
      });
      assert.equal(
        result.status,
        0,
        `TZ=${tz}\n${result.stdout}\n${result.stderr}`,
      );
    }
  });
}

function runChecks() {
  const host = Intl.DateTimeFormat().resolvedOptions().timeZone;
  assert.equal(host, process.env.TZ, `expected host zone ${process.env.TZ}, got ${host}`);

  assert.equal(parseVenueDateTimeLocal("2026-09-29T21:00"), "2026-09-30T02:00:00.000Z");
  assert.equal(parseVenueDateTimeLocal("2026-12-15T21:00"), "2026-12-16T03:00:00.000Z");
  assert.equal(parseVenueDateTimeLocal("2026-09-29T21:00:30"), "2026-09-30T02:00:30.000Z");

  if (process.env.TZ === "UTC") {
    assert.equal(new Date("2026-09-29T21:00").toISOString(), "2026-09-29T21:00:00.000Z");
    assert.notEqual(
      new Date("2026-09-29T21:00").toISOString(),
      parseVenueDateTimeLocal("2026-09-29T21:00"),
    );
  }

  const summer = parseVenueDateTimeLocal("2026-09-29T21:00");
  const winter = parseVenueDateTimeLocal("2026-12-15T21:00");
  assert.match(formatGigWhen(summer), /Sep 29/);
  assert.match(formatGigWhen(summer), /9:00\s*PM/);
  assert.match(formatGigWhen(winter), /Dec 15/);
  assert.match(formatGigWhen(winter), /9:00\s*PM/);
  assert.equal(toVenueDateTimeLocal(summer), "2026-09-29T21:00");
  assert.equal(toVenueDateTimeLocal(winter), "2026-12-15T21:00");
  assert.equal(toVenueDateTimeLocal("2026-09-30T02:00:00+00:00"), "2026-09-29T21:00");

  const beforeFallback = parseVenueDateTimeLocal("2026-10-31T21:00");
  const afterFallback = parseVenueDateTimeLocal("2026-11-01T21:00");
  assert.equal(beforeFallback, "2026-11-01T02:00:00.000Z");
  assert.equal(afterFallback, "2026-11-02T03:00:00.000Z");
  assert.match(formatGigWhen(beforeFallback), /Oct 31/);
  assert.match(formatGigWhen(beforeFallback), /9:00\s*PM/);
  assert.match(formatGigWhen(afterFallback), /\bNov 1\b/);
  assert.match(formatGigWhen(afterFallback), /9:00\s*PM/);
  assert.equal(toVenueDateTimeLocal(beforeFallback), "2026-10-31T21:00");
  assert.equal(toVenueDateTimeLocal(afterFallback), "2026-11-01T21:00");
  assert.equal(localDateKey(beforeFallback), "2026-10-31");
  assert.equal(localDateKey(afterFallback), "2026-11-01");

  assert.equal(parseVenueDateTimeLocal("2026-11-01T00:30"), "2026-11-01T05:30:00.000Z");
  assert.equal(localDateKey("2026-11-01T05:30:00.000Z"), "2026-11-01");
  assert.equal(parseVenueDateTimeLocal("2026-11-01T02:30"), "2026-11-01T08:30:00.000Z");
  assert.equal(toVenueDateTimeLocal("2026-11-01T08:30:00.000Z"), "2026-11-01T02:30");

  // Overlap: 1:30 AM on 2026-11-01 occurs twice. Keep the earlier CDT instant.
  const ambiguous = parseVenueDateTimeLocal("2026-11-01T01:30");
  assert.equal(ambiguous, "2026-11-01T06:30:00.000Z");
  assert.notEqual(ambiguous, "2026-11-01T07:30:00.000Z");
  assert.equal(toVenueDateTimeLocal(ambiguous), "2026-11-01T01:30");
  assert.equal(localDateKey(ambiguous), "2026-11-01");
  assert.equal(localDateKey("2026-11-01T07:30:00.000Z"), "2026-11-01");

  // Gap: 2:30 AM on 2026-03-08 does not exist. Store 3:30 AM CDT.
  const missing = parseVenueDateTimeLocal("2026-03-08T02:30");
  assert.equal(missing, "2026-03-08T08:30:00.000Z");
  assert.equal(toVenueDateTimeLocal(missing), "2026-03-08T03:30");
  assert.equal(parseVenueDateTimeLocal("2026-03-08T02:00"), "2026-03-08T08:00:00.000Z");
  assert.equal(toVenueDateTimeLocal("2026-03-08T08:00:00.000Z"), "2026-03-08T03:00");
  assert.equal(parseVenueDateTimeLocal("2026-03-08T01:30"), "2026-03-08T07:30:00.000Z");
  assert.equal(parseVenueDateTimeLocal("2026-03-08T03:00"), "2026-03-08T08:00:00.000Z");

  assert.equal(localDateKey("2026-11-01T03:00:00.000Z"), "2026-10-31");
  assert.equal(localDateKey("2026-11-02T04:00:00.000Z"), "2026-11-01");
  assert.equal(localDateKey("2026-11-02T05:59:59.000Z"), "2026-11-01");
  assert.equal(localDateKey("2026-11-02T06:00:00.000Z"), "2026-11-02");
  assert.equal(toVenueDateTimeLocal("2026-11-02T06:00:00.000Z"), "2026-11-02T00:00");
  assert.equal(localDateKey("2026-09-29T04:59:59.000Z"), "2026-09-28");
  assert.equal(localDateKey("2026-09-29T05:00:00.000Z"), "2026-09-29");

  assert.equal(startOfLocalDay(new Date("2026-09-29T18:00:00.000Z")).toISOString(), "2026-09-29T05:00:00.000Z");
  assert.equal(startOfLocalDay(new Date("2026-11-02T18:00:00.000Z")).toISOString(), "2026-11-02T06:00:00.000Z");
  assert.equal(startOfLocalDay(new Date("2026-11-01T06:30:00.000Z")).toISOString(), "2026-11-01T05:00:00.000Z");
  assert.notEqual(
    startOfLocalDay(new Date("2026-11-02T18:00:00.000Z")).toISOString(),
    "2026-11-02T05:00:00.000Z",
  );

  const lateOctober = "2026-11-01T03:00:00.000Z";
  assert.equal(gigMatchesVenueDate(lateOctober, "2026-10-31"), true);
  assert.equal(gigMatchesVenueDate(lateOctober, "2026-11-01"), false);
  assert.equal(gigMatchesVenueDate(lateOctober, "", new Date("2026-10-31T18:00:00.000Z")), true);
  assert.equal(gigMatchesVenueDate(lateOctober, "", new Date("2026-11-01T15:00:00.000Z")), false);
  assert.equal(isUpcoming(lateOctober, new Date("2026-11-01T02:30:00.000Z")), true);
  assert.equal(isUpcoming(lateOctober, new Date("2026-11-01T03:00:00.000Z")), true);
  assert.equal(isUpcoming(lateOctober, new Date("2026-11-01T03:00:01.000Z")), false);

  for (const bad of ["", "2026-09-29", "2026-02-31T21:00", "2026-09-29T25:00", "2026-09-29T21:00Z", "2026-09-29T21:00-05:00"]) {
    assert.throws(() => parseVenueDateTimeLocal(bad), /valid date and time/);
  }
}
