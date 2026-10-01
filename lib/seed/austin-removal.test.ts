import assert from "node:assert/strict";
import test from "node:test";
import { AUSTIN_GIG_IDS, AUSTIN_PERFORMER_IDS, AUSTIN_VIDEO_IDS, KNOWN_ORPHAN_CLIP, MILESTONE_GIG_ID } from "./austin-ids";
import { austinClipPaths, AustinSeedRemovalError, planAustinSeedRemoval } from "./austin-removal";

const sample = {
  performers: AUSTIN_PERFORMER_IDS.map((id) => ({ id, userId: null })),
  videos: AUSTIN_VIDEO_IDS.map((id) => ({
    id,
    performerId: id.startsWith("maya") ? "maya-chen" : "bassline-society",
  })),
  gigs: [
    ...AUSTIN_GIG_IDS.map((id) => ({ id, performerId: "maya-chen" })),
    { id: MILESTONE_GIG_ID, performerId: "bassline-society" },
  ],
  bookingPerformerIds: [] as string[],
};

test("Austin removal deletes the explicit ids, including Milestone, and can run again", () => {
  const plan = planAustinSeedRemoval(sample);
  assert.deepEqual(plan.deletePerformerIds, [...AUSTIN_PERFORMER_IDS]);
  assert.deepEqual(plan.deleteVideoIds, [...AUSTIN_VIDEO_IDS]);
  assert.equal(plan.deleteGigIds.at(-1), MILESTONE_GIG_ID);
  assert.equal(plan.deleteGigIds.length, AUSTIN_GIG_IDS.length + 1);
  assert.deepEqual(planAustinSeedRemoval({ performers: [], videos: [], gigs: [], bookingPerformerIds: [] }), plan);
});

test("a claimed Austin performer aborts the swap and deletes nothing", () => {
  assert.throws(
    () =>
      planAustinSeedRemoval({
        ...sample,
        performers: [{ id: "maya-chen", userId: "11111111-1111-1111-1111-111111111111" }],
      }),
    (error: unknown) => {
      assert.ok(error instanceof AustinSeedRemovalError);
      assert.match(error.message, /user_id is set/);
      assert.match(error.message, /Nothing was deleted/);
      return true;
    },
  );
});

test("booking requests abort the swap and are not part of the delete plan", () => {
  assert.throws(
    () => planAustinSeedRemoval({ ...sample, bookingPerformerIds: ["bassline-society"] }),
    /booking_requests exist[\s\S]*not deleted/,
  );
  const plan = planAustinSeedRemoval(sample);
  assert.equal("deleteBookingIds" in plan, false);
});

test("an owner-created gig or video outside the id list aborts", () => {
  assert.throws(
    () =>
      planAustinSeedRemoval({
        ...sample,
        gigs: [...sample.gigs, { id: "owner-gig", performerId: "maya-chen" }],
      }),
    /owner-gig is not in the seed id list/,
  );
  assert.throws(
    () =>
      planAustinSeedRemoval({
        ...sample,
        videos: [...sample.videos, { id: "owner-video", performerId: "dj-nova" }],
      }),
    /owner-video is not in the seed id list/,
  );
});

test("Milestone is allowed, and rows for other performers are ignored", () => {
  const plan = planAustinSeedRemoval({
    performers: [...sample.performers, { id: "monophonics", userId: "22222222-2222-2222-2222-222222222222" }],
    videos: sample.videos,
    gigs: [...sample.gigs, { id: "monophonics-2026-10-03", performerId: "monophonics" }],
    bookingPerformerIds: ["monophonics"],
  });
  assert.ok(plan.deleteGigIds.includes(MILESTONE_GIG_ID));
  assert.ok(!plan.deletePerformerIds.includes("monophonics"));
});

test("clip cleanup stays inside the Austin prefixes", () => {
  const paths = austinClipPaths([
    { prefix: "maya-chen", names: ["6b602aa7-5527-45d0-bf40-651cfd01418c.mp4", ".emptyFolderPlaceholder"] },
    { prefix: "a-j-croce", names: ["keep.mp4"] },
    { prefix: "bassline-society", names: ["set.mp4"] },
  ]);
  assert.deepEqual(paths, [KNOWN_ORPHAN_CLIP, "bassline-society/set.mp4"]);
});
