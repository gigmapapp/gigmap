import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const migration = readFileSync(
  path.join(process.cwd(), "supabase/migrations/20260929150000_create_gigmap_tables.sql"),
  "utf8",
);

test("every app table enables and forces row level security", () => {
  for (const table of ["performers", "videos", "gigs", "booking_requests"]) {
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(migration, new RegExp(`alter table public\\.${table} force row level security`));
  }
});

test("booking requests are not publicly readable", () => {
  assert.match(migration, /grant insert on table public\.booking_requests to anon, authenticated/);
  assert.doesNotMatch(migration, /on public\.booking_requests\s+for select/i);
  assert.doesNotMatch(migration, /grant select(?:,| on)[^;]*booking_requests/i);
});

test("catalog tables are publicly readable and insertable", () => {
  for (const table of ["performers", "videos", "gigs"]) {
    assert.match(migration, new RegExp(`${table}_public_read`));
    assert.match(migration, new RegExp(`${table}_public_insert`));
    assert.match(migration, new RegExp(`grant select, insert on table public\\.${table} to anon, authenticated`));
  }
});

test("clip bucket is public with a size cap and no anon insert policy", () => {
  assert.match(migration, /'clips'/);
  assert.match(migration, /10485760/);
  assert.match(migration, /clips_public_read/);
  assert.match(migration, /clips_service_insert/);
  assert.match(migration, /to service_role/);
  assert.doesNotMatch(migration, /clips_anon_insert|to anon, authenticated\s+with check \(\s*bucket_id = 'clips'/);
});
