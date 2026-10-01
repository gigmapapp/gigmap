import { readFileSync } from "node:fs";
import path from "node:path";
import type { Database } from "@/lib/types";
import { publicListingsFromCsv, type PublicListingSeed } from "@/lib/seed/mystic-csv";

const fixturePath = path.join(process.cwd(), "lib/seed/fixtures/mystic-seed-final.csv");

/** The eight Mystic listings. Notes from the CSV are not included. */
export function mysticSeed(): PublicListingSeed {
  return publicListingsFromCsv(readFileSync(fixturePath, "utf8"));
}

/** Local JSON seed and `npm run seed:supabase`. No videos and no bookings. */
export function seedDatabase(now = new Date()): Database {
  const createdAt = now.toISOString();
  const seed = mysticSeed();
  return {
    performers: seed.performers.map((performer) => ({
      ...performer,
      createdAt,
      claimed: false,
    })),
    gigs: seed.gigs.map((gig) => ({ ...gig, createdAt })),
    bookings: [],
  };
}
