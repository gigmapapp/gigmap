import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { seedDatabase } from "../lib/seed/database";

loadEnvConfig(process.cwd());

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (for example in .env.local).");
  process.exit(1);
}

const db = seedDatabase();
const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

const { error: performerError } = await supabase.from("performers").upsert(
  db.performers.map((performer) => ({
    id: performer.id,
    name: performer.name,
    category: performer.category,
    bio: performer.bio,
    city: performer.city,
    genres: performer.genres,
    created_at: performer.createdAt,
  })),
  { onConflict: "id" },
);
if (performerError) {
  console.error(performerError.message);
  process.exit(1);
}

const videos = db.performers.flatMap((performer) => performer.videos);
if (videos.length > 0) {
  console.error("The Mystic seed inserts no videos. Refusing to upsert clip rows.");
  process.exit(1);
}

const { error: gigError } = await supabase.from("gigs").upsert(
  db.gigs.map((gig) => ({
    id: gig.id,
    performer_id: gig.performerId,
    title: gig.title,
    description: gig.description,
    category: gig.category,
    datetime: gig.datetime,
    lat: gig.location.lat,
    lng: gig.location.lng,
    label: gig.location.label,
    timezone: gig.timezone,
    source_url: gig.sourceUrl,
    source_kind: gig.sourceKind,
    created_at: gig.createdAt,
  })),
  { onConflict: "id" },
);
if (gigError) {
  console.error(gigError.message);
  process.exit(1);
}

console.log(
  `Upserted ${db.performers.length} performers, ${videos.length} videos, and ${db.gigs.length} gigs. booking_requests were not changed.`,
);
