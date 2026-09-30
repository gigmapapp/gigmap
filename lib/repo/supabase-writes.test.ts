import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

function source(relativePath: string) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

test("service role stays server-only, and the browser anon client only signs clip uploads", () => {
  const repo = source("lib/repo/supabase.ts");
  const server = source("lib/supabase/server.ts");
  const upload = source("lib/upload-clip.ts");
  const seed = source("scripts/seed-supabase.ts");
  const browser = source("lib/supabase/browser.ts");

  assert.match(server, /supabaseServiceRoleKey\(\)/);
  assert.doesNotMatch(server, /SUPABASE_ANON_KEY|supabaseAnonKey/);
  assert.match(repo, /getServiceClient\(\)/);
  assert.doesNotMatch(repo, /SUPABASE_ANON_KEY|supabaseAnonKey|NEXT_PUBLIC_SUPABASE_ANON_KEY/);
  assert.match(repo, /from\("booking_requests"\)/);
  assert.match(repo, /\.insert\(/);
  assert.match(repo, /userDb\(\)/);

  assert.match(upload, /uploadToSignedUrl/);
  assert.match(upload, /NEXT_PUBLIC_SUPABASE_ANON_KEY/);
  assert.doesNotMatch(upload, /\.from\(["'](performers|videos|gigs|booking_requests)["']\)/);
  assert.doesNotMatch(upload, /\.insert\(|\.update\(|\.delete\(|\.upsert\(/);

  assert.match(seed, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(seed, /SUPABASE_ANON_KEY|NEXT_PUBLIC_SUPABASE_ANON_KEY/);
  assert.doesNotMatch(browser, /SERVICE_ROLE|service_role/);
});
