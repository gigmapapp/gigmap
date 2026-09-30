import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { seedDatabase } from "../lib/seed/austin";

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

// user_id is omitted so seed rows stay unclaimed and a re-run does not clear one set by hand.
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

let videoIndex = 0;
const videos = db.performers.flatMap((performer) =>
  performer.videos.map((video) => {
    const createdAt = new Date(new Date(performer.createdAt).getTime() + videoIndex).toISOString();
    videoIndex += 1;
    return {
      id: video.id,
      performer_id: performer.id,
      title: video.title,
      source_type: video.sourceType,
      url: video.url,
      created_at: createdAt,
    };
  }),
);

const { error: videoError } = await supabase.from("videos").upsert(videos, { onConflict: "id" });
if (videoError) {
  console.error(videoError.message);
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
