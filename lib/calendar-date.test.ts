import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { formatCalendarDate } from "./calendar-date";

const require = createRequire(import.meta.url);
const tsxCli = require.resolve("tsx/cli");
const repoRoot = fileURLToPath(new URL("..", import.meta.url));

const in2026 = new Date("2026-10-02T15:00:00.000Z");
const in2027 = new Date("2027-06-01T15:00:00.000Z");

test("a date in the current year omits the year", () => {
  assert.equal(formatCalendarDate("2026-10-18", in2026), "Sun, Oct 18");
});

test("a date in another year includes the year", () => {
  assert.equal(formatCalendarDate("2027-01-04", in2026), "Mon, Jan 4, 2027");
});

test("Dec 31 and Jan 1 keep their calendar day and year rule", () => {
  assert.equal(formatCalendarDate("2026-12-31", in2026), "Thu, Dec 31");
  assert.equal(formatCalendarDate("2027-01-01", in2026), "Fri, Jan 1, 2027");
  assert.equal(formatCalendarDate("2026-12-31", in2027), "Thu, Dec 31, 2026");
  assert.equal(formatCalendarDate("2027-01-01", in2027), "Fri, Jan 1");
  assert.equal(formatCalendarDate("2027-01-01", new Date("2026-12-31T23:30:00.000Z")), "Fri, Jan 1, 2027");
  assert.equal(formatCalendarDate("2027-01-01", new Date("2027-01-01T00:30:00.000Z")), "Fri, Jan 1");
});

test("invalid or empty input is returned unchanged", () => {
  for (const value of ["", "not-a-date", "2026-02-31", "2026-13-01", "2026-00-10", "2026-10-18T00:00:00.000Z"]) {
    assert.equal(formatCalendarDate(value, in2026), value);
  }
});

test("Oct 18, Dec 31, and Jan 1 do not shift in Los Angeles or Kiritimati", () => {
  const cases = [
    ["2026-10-18", "2026-10-02T15:00:00.000Z", "Sun, Oct 18"],
    ["2026-12-31", "2026-10-02T15:00:00.000Z", "Thu, Dec 31"],
    ["2027-01-01", "2026-10-02T15:00:00.000Z", "Fri, Jan 1, 2027"],
  ] as const;
  for (const tz of ["America/Los_Angeles", "Pacific/Kiritimati"]) {
    for (const [value, now, expected] of cases) {
      assert.equal(formatInTimeZone(tz, value, now), expected, `${tz} ${value}`);
    }
  }
});

function formatInTimeZone(timeZone: string, value: string, now: string) {
  const script = `
    import { formatCalendarDate } from "./lib/calendar-date.ts";
    process.stdout.write(formatCalendarDate(${JSON.stringify(value)}, new Date(${JSON.stringify(now)})));
  `;
  const result = spawnSync(process.execPath, [tsxCli, "-e", script], {
    cwd: repoRoot,
    env: { ...process.env, TZ: timeZone },
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout;
}
