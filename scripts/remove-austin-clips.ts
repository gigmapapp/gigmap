import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { AUSTIN_PERFORMER_IDS, KNOWN_ORPHAN_CLIP } from "../lib/seed/austin-ids";
import { austinClipPaths } from "../lib/seed/austin-removal";

// Deletes leftover clip objects under the retired Austin performer ids.
// Hosted Supabase blocks DELETE on storage.objects, so this uses the Storage
// API with the service role. It does not delete videos rows or other prefixes.
//
// Dry-run is the default. Nothing is removed unless --apply is passed.
//
//   npx tsx scripts/remove-austin-clips.ts
//   npx tsx scripts/remove-austin-clips.ts --apply
//
// Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
// The known orphan, with no videos row, is maya-chen/6b602aa7-5527-45d0-bf40-651cfd01418c.mp4.
//
// Dashboard alternative: Storage → clips → open each of these folders and
// delete the files inside. Do not delete folders whose name is not in the list.
//   maya-chen, broken-strings, dj-nova, elijah-brooks, velvet-static,
//   luna-park, nightbirds, harper-quinn, bassline-society, copper-notes

loadEnvConfig(process.cwd());

const apply = process.argv.includes("--apply");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (for example in .env.local).");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

const listed: Array<{ prefix: string; names: string[] }> = [];

for (const prefix of AUSTIN_PERFORMER_IDS) {
  const names: string[] = [];
  for (let offset = 0; ; offset += 100) {
    const page = await supabase.storage.from("clips").list(prefix, { limit: 100, offset });
    if (page.error) {
      console.error(`Could not list clips/${prefix}: ${page.error.message}`);
      process.exit(1);
    }
    const batch = page.data ?? [];
    for (const item of batch) {
      if (item.id && item.name) names.push(item.name);
    }
    if (batch.length < 100) break;
  }
  listed.push({ prefix, names });
}

const paths = austinClipPaths(listed);

if (paths.length === 0) {
  console.log("No clip objects under the Austin performer prefixes.");
  process.exit(0);
}

for (const objectPath of paths) {
  const note = objectPath === KNOWN_ORPHAN_CLIP ? " (known orphan, no videos row)" : "";
  console.log(`${apply ? "remove" : "would remove"} clips/${objectPath}${note}`);
}

if (!apply) {
  console.log(`Dry run: ${paths.length} object${paths.length === 1 ? "" : "s"}. Pass --apply to delete them.`);
  process.exit(0);
}

const removed = await supabase.storage.from("clips").remove(paths);
if (removed.error) {
  console.error(removed.error.message);
  process.exit(1);
}

console.log(`Removed ${paths.length} object${paths.length === 1 ? "" : "s"}.`);
