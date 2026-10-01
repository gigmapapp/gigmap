import {
  AUSTIN_GIG_IDS_TO_DELETE,
  AUSTIN_PERFORMER_IDS,
  AUSTIN_VIDEO_IDS,
} from "@/lib/seed/austin-ids";

const performers = new Set<string>(AUSTIN_PERFORMER_IDS);
const videos = new Set<string>(AUSTIN_VIDEO_IDS);
const gigs = new Set<string>(AUSTIN_GIG_IDS_TO_DELETE);

export class AustinSeedRemovalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AustinSeedRemovalError";
  }
}

export type AustinRemovalSnapshot = {
  performers: Array<{ id: string; userId?: string | null }>;
  videos: Array<{ id: string; performerId: string }>;
  gigs: Array<{ id: string; performerId: string }>;
  bookingPerformerIds: string[];
};

/**
 * Decide whether the explicit Austin id lists may be deleted.
 *
 * A non-null user_id means the profile was claimed. A booking_requests row is
 * a real request, so it is not deleted and the swap aborts. A video or gig
 * for one of these performers that is not in the id list was not part of the
 * sample, so it is left in place and the swap aborts (deleting the performer
 * would cascade it). Booking rows are not part of the returned delete lists.
 */
export function planAustinSeedRemoval(snapshot: AustinRemovalSnapshot): {
  deleteVideoIds: string[];
  deleteGigIds: string[];
  deletePerformerIds: string[];
} {
  for (const performer of snapshot.performers) {
    if (!performers.has(performer.id) || !performer.userId) continue;
    throw new AustinSeedRemovalError(
      `Refusing to delete Austin seed performer ${performer.id}: user_id is set. Nothing was deleted.`,
    );
  }

  for (const performerId of snapshot.bookingPerformerIds) {
    if (!performers.has(performerId)) continue;
    throw new AustinSeedRemovalError(
      `Refusing to delete Austin seed performer ${performerId}: booking_requests exist. Those requests were not deleted. Nothing was deleted.`,
    );
  }

  for (const video of snapshot.videos) {
    if (!performers.has(video.performerId) || videos.has(video.id)) continue;
    throw new AustinSeedRemovalError(
      `Refusing to delete Austin seed performer ${video.performerId}: video ${video.id} is not in the seed id list. Nothing was deleted.`,
    );
  }

  for (const gig of snapshot.gigs) {
    if (!performers.has(gig.performerId) || gigs.has(gig.id)) continue;
    throw new AustinSeedRemovalError(
      `Refusing to delete Austin seed performer ${gig.performerId}: gig ${gig.id} is not in the seed id list. Nothing was deleted.`,
    );
  }

  return {
    deleteVideoIds: [...AUSTIN_VIDEO_IDS],
    deleteGigIds: [...AUSTIN_GIG_IDS_TO_DELETE],
    deletePerformerIds: [...AUSTIN_PERFORMER_IDS],
  };
}

/** Object paths under the Austin performer prefixes. Other prefixes are ignored. */
export function austinClipPaths(listed: Array<{ prefix: string; names: string[] }>): string[] {
  const paths: string[] = [];
  for (const entry of listed) {
    if (!performers.has(entry.prefix)) continue;
    for (const name of entry.names) {
      if (!name || name.startsWith(".") || name.includes("/") || name.includes("\\")) continue;
      paths.push(`${entry.prefix}/${name}`);
    }
  }
  return paths;
}
