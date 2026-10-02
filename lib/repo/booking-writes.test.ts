import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

function source(relativePath: string) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

test("json and supabase booking adapters share status rules and the user client", () => {
  const json = source("lib/repo/json.ts");
  const supabase = source("lib/repo/supabase.ts");
  const repo = source("lib/repo/index.ts");

  assert.match(json, /insertBookingRequest/);
  assert.match(json, /transitionBookingRequest/);
  assert.match(json, /incomingBookingRequests/);
  assert.match(json, /requesterBookingRequests/);
  assert.match(json, /normalizeStoredBooking/);

  const create = supabase.slice(
    supabase.indexOf("async create(input: CreateBookingInput)"),
    supabase.indexOf("async setStatus"),
  );
  assert.match(create, /userDb\(/);
  assert.match(create, /requester_id: userId/);
  assert.match(create, /bookingTargetError/);
  assert.doesNotMatch(create, /getServiceClient\(\)/);

  const status = supabase.slice(
    supabase.indexOf("async setStatus"),
    supabase.indexOf("export async function createClipUploadTarget"),
  );
  assert.match(status, /userDb\(/);
  assert.match(status, /decideBookingTransition/);
  assert.match(status, /\.update\(\{ status \}\)/);
  assert.doesNotMatch(status, /getServiceClient\(\)/);

  assert.match(repo, /listByRequester/);
  assert.match(repo, /setStatus/);
});
