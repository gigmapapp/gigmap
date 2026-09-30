import {
  AUSTIN_GIG_IDS_TO_DELETE,
  AUSTIN_PERFORMER_IDS,
  AUSTIN_VIDEO_IDS,
  MILESTONE_GIG_ID,
} from "@/lib/seed/austin-ids";
import { mysticSeed } from "@/lib/seed/database";
import type { PublicListingGig, PublicListingPerformer } from "@/lib/seed/mystic-csv";

function sqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function sqlTextArray(values: readonly string[]): string {
  if (values.length === 0) return "array[]::text[]";
  return `array[${values.map((value) => sqlString(value)).join(", ")}]::text[]`;
}

function performerValues(performer: PublicListingPerformer): string {
  return `  (${sqlString(performer.id)}, ${sqlString(performer.name)}, ${sqlString(performer.category)}, ${sqlString(performer.bio)}, ${sqlString(performer.city)}, ${sqlTextArray(performer.genres)}, now())`;
}

function gigValues(gig: PublicListingGig): string {
  return `  (${sqlString(gig.id)}, ${sqlString(gig.performerId)}, ${sqlString(gig.title)}, ${sqlString(gig.description)}, ${sqlString(gig.category)}, ${sqlString(gig.datetime)}::timestamptz, ${gig.location.lat}, ${gig.location.lng}, ${sqlString(gig.location.label)}, ${sqlString(gig.timezone)}, ${sqlString(gig.sourceUrl)}, ${sqlString(gig.sourceKind)}, now())`;
}

const performerInsert = (rows: PublicListingPerformer[]) => `insert into public.performers (id, name, category, bio, city, genres, created_at)
values
${rows.map(performerValues).join(",\n")}
on conflict (id) do update set
  name = excluded.name,
  category = excluded.category,
  bio = excluded.bio,
  city = excluded.city,
  genres = excluded.genres;
`;

const gigInsert = (rows: PublicListingGig[]) => `insert into public.gigs (
  id, performer_id, title, description, category, datetime, lat, lng, label, timezone, source_url, source_kind, created_at
)
values
${rows.map(gigValues).join(",\n")}
on conflict (id) do update set
  performer_id = excluded.performer_id,
  title = excluded.title,
  description = excluded.description,
  category = excluded.category,
  datetime = excluded.datetime,
  lat = excluded.lat,
  lng = excluded.lng,
  label = excluded.label,
  timezone = excluded.timezone,
  source_url = excluded.source_url,
  source_kind = excluded.source_kind;
`;

/**
 * Idempotent Mystic seed for a fresh database (`supabase db reset`).
 * Does not delete Austin rows. An existing project uses the swap migration.
 */
export function renderSeedSql(): string {
  const seed = mysticSeed();
  return `-- Mystic public listings for Gig Map. Safe to re-run: these ids are upserted.
-- Does not delete the retired Austin sample. That delete is
-- supabase/migrations/20260930183000_replace_austin_seed_with_mystic.sql.
-- Does not write booking_requests or videos. CSV notes are not stored.
-- Each datetime is date + start_time_et in the IANA zone looked up from lat/lng.
-- user_id is omitted. When that column exists (PR #10), the default NULL leaves
-- the profile unclaimed, and this upsert does not clear a later claim.
-- Generated from lib/seed/fixtures/mystic-seed-final.csv.
-- Re-render with: npx tsx scripts/render-seed-sql.ts

${performerInsert(seed.performers)}
${gigInsert(seed.gigs)}`;
}

/**
 * Prod swap: delete the Austin sample by id, then upsert the Mystic listings.
 * Generated from the same loader as supabase/seed.sql.
 */
export function renderSeedSwapSql(): string {
  const seed = mysticSeed();
  const performerIds = sqlTextArray(AUSTIN_PERFORMER_IDS);
  const videoIds = sqlTextArray(AUSTIN_VIDEO_IDS);
  const gigIds = sqlTextArray(AUSTIN_GIG_IDS_TO_DELETE);

  return `-- Replace the Austin sample with the Mystic public listings.
-- Apply after 20260930182000_gigs_public_listing.sql so source_url and
-- source_kind exist, and after 20260930181000_gigs_timezone_not_null.sql.
--
-- Apply PR #10 (20260930120600_performer_auth_ownership.sql) before this file
-- when that migration is in use. The claim guard below reads performers.user_id
-- only when the column exists. If this file runs first, nobody can have claimed
-- a profile yet, and PR #10 later adds user_id NULL.
--
-- Never re-run 20260929160000_revoke_anon_table_writes.sql after the PR #10
-- ownership migration. That revoke drops the owner write policies.
--
-- Deletes only the performer, video, and gig ids listed below, plus the live
-- Milestone gig ${MILESTONE_GIG_ID} (performer bassline-society, Connecticut).
-- Aborts, and deletes nothing, when:
--   * one of those performers has a non-null user_id (claimed)
--   * booking_requests reference one of them (requests are not deleted;
--     the table is empty today, and a request is not sample data)
--   * a video or gig for one of them is outside the id lists (owner-created;
--     deleting the performer would cascade it)
-- Dependent rows are deleted in FK order: videos, gigs, then performers.
-- Does not touch storage.objects. Clips are scripts/remove-austin-clips.ts.
--
-- Then upserts the 8 listings. ON CONFLICT updates public fields and does not
-- set user_id, so a later claim survives a re-run. CSV notes are not stored.
-- No videos rows are inserted. Safe to re-run.
-- Generated from lib/seed/fixtures/mystic-seed-final.csv.
-- Re-render with: npx tsx scripts/render-seed-sql.ts

do $$
declare
  performer_ids text[] := ${performerIds};
  video_ids text[] := ${videoIds};
  gig_ids text[] := ${gigIds};
  claimed integer;
  bookings integer;
  extra_videos integer;
  extra_gigs integer;
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'performers'
      and column_name = 'user_id'
  ) then
    execute
      'select count(*) from public.performers where id = any ($1) and user_id is not null'
      into claimed
      using performer_ids;
    if claimed > 0 then
      raise exception 'Refusing to delete Austin seed performers that have been claimed (non-null user_id). Nothing was deleted.';
    end if;
  end if;

  select count(*) into bookings
  from public.booking_requests
  where performer_id = any (performer_ids);
  if bookings > 0 then
    raise exception 'Refusing to delete Austin seed performers that have booking_requests. Those requests were not deleted. Nothing was deleted.';
  end if;

  select count(*) into extra_videos
  from public.videos
  where performer_id = any (performer_ids)
    and id <> all (video_ids);
  if extra_videos > 0 then
    raise exception 'Refusing to delete Austin seed performers that have videos outside the seed id list. Nothing was deleted.';
  end if;

  select count(*) into extra_gigs
  from public.gigs
  where performer_id = any (performer_ids)
    and id <> all (gig_ids);
  if extra_gigs > 0 then
    raise exception 'Refusing to delete Austin seed performers that have gigs outside the seed id list. Nothing was deleted.';
  end if;

  delete from public.videos where id = any (video_ids);
  delete from public.gigs where id = any (gig_ids);
  delete from public.performers where id = any (performer_ids);
end
$$;

${performerInsert(seed.performers)}
${gigInsert(seed.gigs)}`;
}
