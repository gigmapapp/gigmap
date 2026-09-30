import { isVenueTimeZoneName, lookupVenueTimeZone } from "@/lib/venue-zone";
import { SEED_GIGS, SEED_PERFORMERS } from "./austin";

function sqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function sqlTextArray(values: string[]): string {
  if (values.length === 0) return "array[]::text[]";
  return `array[${values.map(sqlString).join(", ")}]::text[]`;
}

function sqlGigTime(dayOffset: number, hour: number, minute: number, timeZone: string): string {
  if (!isVenueTimeZoneName(timeZone)) throw new Error(`Refusing to seed unknown time zone ${timeZone}.`);
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  const zone = sqlString(timeZone);
  return `((timezone(${zone}, now()))::date + ${dayOffset} + time '${hh}:${mm}') at time zone ${zone}`;
}

/**
 * Idempotent Austin seed. Each gig's wall clock is interpreted in the IANA zone
 * looked up from that pin (every current Austin pin is America/Chicago). Times
 * stay relative to whenever this script runs, so the map stays in the future.
 * source_url and source_kind stay null: these rows are the Austin demo, not
 * public listings. Booking requests are left untouched. The Mystic CSV is not
 * loaded here.
 */
export function renderSeedSql(): string {
  const performerRows = SEED_PERFORMERS.map(
    (performer) =>
      `  (${sqlString(performer.id)}, ${sqlString(performer.name)}, ${sqlString(performer.category)}, ${sqlString(performer.bio)}, ${sqlString(performer.city)}, ${sqlTextArray(performer.genres)}, now())`,
  ).join(",\n");

  let videoIndex = 0;
  const videoRows = SEED_PERFORMERS.flatMap((performer) =>
    performer.videos.map((video) => {
      const created = `now() + interval '${videoIndex} milliseconds'`;
      videoIndex += 1;
      return `  (${sqlString(video.id)}, ${sqlString(performer.id)}, ${sqlString(video.title)}, ${sqlString(video.sourceType)}, ${sqlString(video.url)}, ${created})`;
    }),
  ).join(",\n");

  const gigRows = SEED_GIGS.map((row) => {
    const timezone = lookupVenueTimeZone(row.location.lat, row.location.lng);
    return `  (${sqlString(row.id)}, ${sqlString(row.performerId)}, ${sqlString(row.title)}, ${sqlString(row.description)}, ${sqlString(row.category)}, ${sqlGigTime(row.dayOffset, row.hour, row.minute, timezone)}, ${row.location.lat}, ${row.location.lng}, ${sqlString(row.location.label)}, ${sqlString(timezone)}, null, null, now())`;
  }).join(",\n");

  return `-- Austin seed for Gig Map. Safe to re-run: seeded ids are upserted, booking_requests are not modified.
-- Apply supabase/migrations in filename order first. On a fresh database
-- (supabase db reset) the legacy drop and the rls_auto_enable revoke are
-- no-ops, and the clips bucket migration creates the storage.buckets row named clips.
-- This file then fills the v1 tables.
-- Gig times are venue wall-clock times (Austin pins resolve to America/Chicago), from tomorrow through about six weeks after this runs.
-- timezone is that IANA name. source_url and source_kind are null (not a public listing).
-- Generated from lib/seed/austin.ts. Edit the seed data there, then re-render this file
-- with: npx tsx scripts/render-seed-sql.ts

insert into public.performers (id, name, category, bio, city, genres, created_at)
values
${performerRows}
on conflict (id) do update set
  name = excluded.name,
  category = excluded.category,
  bio = excluded.bio,
  city = excluded.city,
  genres = excluded.genres;

insert into public.videos (id, performer_id, title, source_type, url, created_at)
values
${videoRows}
on conflict (id) do update set
  performer_id = excluded.performer_id,
  title = excluded.title,
  source_type = excluded.source_type,
  url = excluded.url,
  created_at = excluded.created_at;

insert into public.gigs (
  id, performer_id, title, description, category, datetime, lat, lng, label, timezone, source_url, source_kind, created_at
)
values
${gigRows}
on conflict (id) do update set
  performer_id = excluded.performer_id,
  title = excluded.title,
  description = excluded.description,
  category = excluded.category,
  datetime = excluded.datetime,
  lat = excluded.lat,
  lng = excluded.lng,
  label = excluded.label,
  timezone = excluded.timezone;
`;
}
