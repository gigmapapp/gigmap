import assert from "node:assert/strict";
import test from "node:test";
import { profileSaveFailure, profileUpdateColumns, updateOwnedPerformer, type OwnedPerformerRow } from "./profile-update";

const ownerA: OwnedPerformerRow = {
  id: "owner-a",
  userId: "user-a",
  name: "Owner A",
  category: "band",
  bio: "original",
  city: "Austin, TX",
  genres: ["rock"],
};

const ownerB: OwnedPerformerRow = {
  id: "owner-b",
  userId: "user-b",
  name: "Owner B",
  category: "dj",
  bio: "",
  city: "Austin, TX",
  genres: [],
};

const demo: OwnedPerformerRow = {
  id: "demo-act",
  userId: null,
  name: "Demo Act",
  category: "solo",
  bio: "",
  city: "Austin, TX",
  genres: [],
};

const patch = profileUpdateColumns({
  name: " Hacked ",
  category: "dj",
  bio: " stolen ",
  city: "",
  genres: "nope, noise",
});

test("another user cannot update a profile, its slug, or its owner", () => {
  assert.ok(patch);
  const rows = [ownerA, ownerB, demo];
  const attempt = updateOwnedPerformer(rows, "user-b", "owner-a", patch);
  assert.equal(attempt.updated, false);
  assert.equal(attempt.rows[0], ownerA);
  assert.equal(attempt.rows[0]?.id, "owner-a");
  assert.equal(attempt.rows[0]?.userId, "user-a");
  assert.equal(attempt.rows[0]?.name, "Owner A");

  const demoAttempt = updateOwnedPerformer(rows, "user-b", "demo-act", patch);
  assert.equal(demoAttempt.updated, false);
  assert.equal(demoAttempt.rows[2]?.name, "Demo Act");
  assert.equal(demoAttempt.rows[2]?.userId, null);

  const own = updateOwnedPerformer(rows, "user-a", "owner-a", patch);
  assert.equal(own.updated, true);
  assert.equal(own.rows[0]?.id, "owner-a");
  assert.equal(own.rows[0]?.userId, "user-a");
  assert.equal(own.rows[0]?.name, "Hacked");
  assert.equal(own.rows[0]?.category, "dj");
  assert.equal(own.rows[0]?.bio, "stolen");
  assert.equal(own.rows[0]?.city, "Austin, TX");
  assert.deepEqual(own.rows[0]?.genres, ["nope", "noise"]);
  assert.equal(own.rows[1], ownerB);
});

test("profile update columns never include id or user id", () => {
  const columns = profileUpdateColumns({
    name: "Night Birds",
    category: "band",
    bio: "horns",
    city: "Austin, TX",
    genres: "jazz, soul",
  });
  assert.deepEqual(Object.keys(columns ?? {}).sort(), ["bio", "category", "city", "genres", "name"]);
  assert.equal(profileSaveFailure({ name: "  ", category: "orchestra" })?.fieldErrors.name, "Name is required.");
  assert.equal(profileSaveFailure({ name: "Night Birds", category: "band" }), null);
});
