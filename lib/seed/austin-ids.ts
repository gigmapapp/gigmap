/**
 * Explicit ids from the retired Austin sample.
 * Deletes name these ids. They are not a predicate on city, title, or performer.
 */

export const AUSTIN_PERFORMER_IDS = [
  "maya-chen",
  "broken-strings",
  "dj-nova",
  "elijah-brooks",
  "velvet-static",
  "luna-park",
  "nightbirds",
  "harper-quinn",
  "bassline-society",
  "copper-notes",
] as const;

export const AUSTIN_VIDEO_IDS = [
  "maya-v1",
  "maya-v2",
  "maya-v3",
  "broken-v1",
  "broken-v2",
  "nova-v1",
  "nova-v2",
  "elijah-v1",
  "velvet-v1",
  "velvet-v2",
  "luna-v1",
  "rio-v1",
  "rio-v2",
  "harper-v1",
  "harper-v2",
  "bass-v1",
  "copper-v1",
  "copper-v2",
] as const;

export const AUSTIN_GIG_IDS = [
  "gig-antones-maya",
  "gig-stubbs-rio",
  "gig-mohawk-velvet",
  "gig-empire-nova",
  "gig-continental-broken",
  "gig-cboy-elijah",
  "gig-saxon-harper",
  "gig-whitehorse-copper",
  "gig-parish-bassline",
  "gig-hotelvegas-maya",
  "gig-cheerup-luna",
  "gig-acl-velvet",
] as const;

/**
 * Live row that is not in the Austin seed file. Title/label Milestone,
 * performer_id bassline-society, venue in Connecticut.
 */
export const MILESTONE_GIG_ID = "1139b90f-1953-4ace-bc83-5296df2a2f5d";

export const AUSTIN_GIG_IDS_TO_DELETE = [...AUSTIN_GIG_IDS, MILESTONE_GIG_ID] as const;

export const KNOWN_ORPHAN_CLIP = "maya-chen/6b602aa7-5527-45d0-bf40-651cfd01418c.mp4";
