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
  city: " Dallas ",
  genres: "nope, noise, Nope",
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
  assert.equal(own.rows[0]?.city, "Dallas");
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
  assert.equal(
    profileSaveFailure({ name: "  ", category: "orchestra", bio: "", city: "Austin, TX", genres: "" })?.fieldErrors
      .name,
    "Name is required.",
  );
  assert.equal(
    profileSaveFailure({ name: "Night Birds", category: "band", bio: "", city: "Austin, TX", genres: "" }),
    null,
  );
});

test("profile fields reject an empty city, a long bio, and messy genres", () => {
  const emptyCity = profileSaveFailure({
    name: "Night Birds",
    category: "band",
    bio: "",
    city: "   ",
    genres: "",
  });
  assert.equal(emptyCity?.fieldErrors.city, "City is required.");
  assert.equal(emptyCity?.formError, "Please fix the highlighted fields.");
  assert.equal(emptyCity?.message, "Please fix the highlighted fields.");
  assert.equal(profileUpdateColumns({ name: "Night Birds", category: "band", bio: "", city: "", genres: "" }), null);

  const longName = profileSaveFailure({
    name: "N".repeat(81),
    category: "band",
    bio: "",
    city: "Austin, TX",
    genres: "",
  });
  assert.match(longName?.fieldErrors.name ?? "", /80/);

  const longBio = "x".repeat(501);
  const bio = profileSaveFailure({
    name: "Night Birds",
    category: "band",
    bio: longBio,
    city: "Austin, TX",
    genres: "jazz",
  });
  assert.match(bio?.fieldErrors.bio ?? "", /500/);

  const longCity = profileSaveFailure({
    name: "Night Birds",
    category: "band",
    bio: "",
    city: "A".repeat(81),
    genres: "",
  });
  assert.match(longCity?.fieldErrors.city ?? "", /80/);

  const genres = profileSaveFailure({
    name: "Night Birds",
    category: "solo",
    bio: "",
    city: "Austin, TX",
    genres: "a, b, c, d, e, f, g, h, i",
  });
  assert.match(genres?.fieldErrors.genres ?? "", /8/);

  const longGenre = profileSaveFailure({
    name: "Night Birds",
    category: "solo",
    bio: "",
    city: "Austin, TX",
    genres: `${"g".repeat(33)}, jazz`,
  });
  assert.match(longGenre?.fieldErrors.genres ?? "", /32/);

  const cleaned = profileUpdateColumns({
    name: "Night Birds",
    category: "band",
    bio: " horns ",
    city: " Austin, TX ",
    genres: " jazz, soul, Jazz, , soul ",
  });
  assert.equal(cleaned?.city, "Austin, TX");
  assert.equal(cleaned?.bio, "horns");
  assert.deepEqual(cleaned?.genres, ["jazz", "soul"]);
});
