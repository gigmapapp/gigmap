import { writeFileSync } from "node:fs";
import path from "node:path";
import { renderSeedSql, renderSeedSwapSql } from "../lib/seed/sql";

const seedPath = path.join(process.cwd(), "supabase", "seed.sql");
const swapPath = path.join(
  process.cwd(),
  "supabase/migrations/20260930183000_replace_austin_seed_with_mystic.sql",
);
writeFileSync(seedPath, renderSeedSql(), "utf8");
writeFileSync(swapPath, renderSeedSwapSql(), "utf8");
console.log(`Wrote ${seedPath}`);
console.log(`Wrote ${swapPath}`);
