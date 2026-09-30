import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

function source(relativePath: string) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

test("server authorization uses getClaims and not the stub cookie", () => {
  const session = source("lib/auth/session.ts");
  const proxy = source("lib/supabase/proxy.ts");
  const exchange = source("lib/auth/exchange.ts");
  const browser = source("lib/supabase/browser.ts");
  const combined = [session, proxy, exchange, browser, source("app/actions/auth.ts")].join("\n");

  assert.match(session, /getClaims\(/);
  assert.match(proxy, /getClaims\(/);
  assert.doesNotMatch(combined, /getSession\(/);
  assert.doesNotMatch(combined, /user_metadata/);
  assert.match(proxy, /LEGACY_STUB_COOKIE/);
  assert.doesNotMatch(combined, /cookies\(\)\.set\(\s*LEGACY_STUB_COOKIE|store\.set\(\s*LEGACY_STUB_COOKIE/);
  assert.match(browser, /createBrowserClient/);
  assert.doesNotMatch(browser, /SERVICE_ROLE|serviceRole/);
});

test("owner writes use the user client and bookings stay on the service role", () => {
  const repo = source("lib/repo/supabase.ts");
  const bookings = source("app/actions/bookings.ts");
  const videos = source("app/actions/videos.ts");

  assert.match(repo, /createAuthServerClient/);
  assert.match(repo, /getClaims\(/);
  assert.match(bookings, /bookingTargetError/);
  assert.match(videos, /ownerUserId/);
  assert.match(repo, /ownerUserId/);
  assert.match(repo, /clipObjectPath/);
  assert.doesNotMatch(repo, /getSession\(/);

  const createClip = repo.slice(repo.indexOf("export async function createClipUploadTarget"));
  assert.match(createClip, /getServiceClient\(\)/);
  assert.match(createClip, /user_id !== input\.ownerUserId/);

  const bookingCreate = repo.slice(repo.indexOf("async create(input: CreateBookingInput)"));
  assert.match(bookingCreate, /bookingTargetError/);
  assert.match(bookingCreate, /getServiceClient\(\)/);
});
