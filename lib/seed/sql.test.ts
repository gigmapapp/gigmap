import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { SEED_GIGS } from "./austin";
import { renderSeedSql } from "./sql";

test("supabase/seed.sql matches the Austin seed", () => {
  const file = readFileSync(path.join(process.cwd(), "supabase", "seed.sql"), "utf8");
  assert.equal(file, renderSeedSql());
  for (const gig of SEED_GIGS) {
    assert.match(file, new RegExp(`\\+ ${gig.dayOffset} \\+ time '`));
    assert.match(file, new RegExp(gig.id));
  }
  assert.doesNotMatch(file, /insert into public\.booking_requests/i);
  assert.match(file, /America\/Chicago/);
});
