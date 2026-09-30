import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { planTimezoneBackfill } from "../lib/venue-zone";

// Fills gigs.timezone from lat/lng where it is still null.
// Run after 20260930180000_gigs_add_timezone.sql and before
// 20260930181000_gigs_timezone_not_null.sql.
//
//   npx tsx scripts/backfill-gig-timezones.ts
//   npx tsx scripts/backfill-gig-timezones.ts --dry-run
//
// Uses NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, same as
// scripts/seed-supabase.ts. Does not set NOT NULL and does not delete rows.

loadEnvConfig(process.cwd());

const dryRun = process.argv.includes("--dry-run");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (for example in .env.local).");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

const { data, error } = await supabase.from("gigs").select("id, lat, lng, timezone").is("timezone", null);
if (error) {
  console.error(error.message);
  console.error("Apply supabase/migrations/20260930180000_gigs_add_timezone.sql before this script.");
  process.exit(1);
}

const rows = (data ?? []) as Array<{ id: string; lat: number; lng: number; timezone: string | null }>;
const plan = planTimezoneBackfill(rows);

if (plan.length === 0) {
  console.log("No gigs with a null timezone. Nothing to do.");
  process.exit(0);
}

for (const row of plan) {
  console.log(`${row.id} ${row.timezone}`);
}

if (dryRun) {
  console.log(`Dry run: ${plan.length} gig${plan.length === 1 ? "" : "s"} would be updated.`);
  process.exit(0);
}

for (const row of plan) {
  const updated = await supabase
    .from("gigs")
    .update({ timezone: row.timezone })
    .eq("id", row.id)
    .is("timezone", null);
  if (updated.error) {
    console.error(`Could not update ${row.id}: ${updated.error.message}`);
    process.exit(1);
  }
}

console.log(`Updated ${plan.length} gig${plan.length === 1 ? "" : "s"}. Apply 20260930181000_gigs_timezone_not_null.sql next.`);
