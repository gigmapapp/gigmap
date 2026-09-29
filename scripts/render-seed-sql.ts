import { writeFileSync } from "node:fs";
import path from "node:path";
import { renderSeedSql } from "../lib/seed/sql";

const target = path.join(process.cwd(), "supabase", "seed.sql");
writeFileSync(target, renderSeedSql(), "utf8");
console.log(`Wrote ${target}`);
