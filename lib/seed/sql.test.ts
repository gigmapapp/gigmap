import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { AUSTIN_GIG_IDS, AUSTIN_PERFORMER_IDS, AUSTIN_VIDEO_IDS, MILESTONE_GIG_ID } from "./austin-ids";
import { mysticSeed } from "./database";
import { renderSeedSql, renderSeedSwapSql } from "./sql";

const swapFile = "supabase/migrations/20260930183000_replace_austin_seed_with_mystic.sql";

test("supabase/seed.sql matches the Mystic loader", () => {
  const file = readFileSync(path.join(process.cwd(), "supabase/seed.sql"), "utf8");
  assert.equal(file, renderSeedSql());
  const seed = mysticSeed();
  assert.equal(seed.performers.length, 8);
  assert.equal(seed.gigs.length, 8);
  for (const gig of seed.gigs) {
    assert.match(file, new RegExp(gig.id));
    assert.match(file, new RegExp(gig.datetime.replaceAll(".", "\\.")));
  }
  assert.match(file, /on conflict \(id\) do update set/);
  assert.match(file, /source_kind/);
  assert.match(file, /'public_info'/);
  assert.match(file, /America\/New_York/);
  assert.doesNotMatch(file, /insert into public\.videos/i);
  assert.doesNotMatch(file, /insert into public\.booking_requests/i);
  assert.doesNotMatch(file, /insert into public\.performers \([^)]*user_id/i);
  assert.doesNotMatch(file, /straight-line|maya-chen|Antone/);
  assert.equal(renderSeedSql(), renderSeedSql());
});

test("the swap migration is idempotent, guarded, and does not alter storage", () => {
  const file = readFileSync(path.join(process.cwd(), swapFile), "utf8");
  assert.equal(file, renderSeedSwapSql());
  assert.equal(renderSeedSwapSql(), renderSeedSwapSql());

  for (const id of [...AUSTIN_PERFORMER_IDS, ...AUSTIN_VIDEO_IDS, ...AUSTIN_GIG_IDS, MILESTONE_GIG_ID]) {
    assert.match(file, new RegExp(id.replaceAll("-", "\\-")));
  }

  assert.match(file, /user_id is not null/);
  assert.match(file, /non-null user_id/);
  assert.match(file, /booking_requests/);
  assert.match(file, /Those requests were not deleted/);
  assert.match(file, /videos outside the seed id list/);
  assert.match(file, /gigs outside the seed id list/);
  assert.match(file, /delete from public\.videos where id = any/i);
  assert.match(file, /delete from public\.gigs where id = any/i);
  assert.match(file, /delete from public\.performers where id = any/i);
  assert.doesNotMatch(file, /delete from public\.gigs where performer_id/i);
  assert.doesNotMatch(file, /delete from public\.videos where performer_id/i);
  assert.doesNotMatch(file, /delete from public\.booking_requests/i);
  assert.doesNotMatch(file, /delete from public\.performers where(?! id = any)/i);
  assert.match(file, /on conflict \(id\) do update set/);
  assert.doesNotMatch(file, /insert into public\.videos/i);
  const statements = file
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");
  assert.doesNotMatch(statements, /storage\.objects|alter table storage/i);
  assert.doesNotMatch(statements, /straight-line|Wailing City/);
  assert.match(file, /20260929160000_revoke_anon_table_writes/);
  assert.match(file, /2026-10-04T00:00:00\.000Z/);
  assert.match(file, /'public_info'/);

  const videosAt = file.indexOf("delete from public.videos");
  const gigsAt = file.indexOf("delete from public.gigs");
  const performersAt = file.indexOf("delete from public.performers");
  assert.ok(videosAt > 0 && videosAt < gigsAt && gigsAt < performersAt);
});
