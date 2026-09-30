import assert from "node:assert/strict";
import test from "node:test";
import {
  REFUSE_BOOKINGS_FOR_UNCLAIMED_PERFORMERS,
  asOtpType,
  bookingTargetError,
  bookingsOpenForPerformer,
  defaultNextForOtp,
  isClaimedPerformer,
  parseProfileFields,
  safeNextPath,
  validateEmail,
  validatePassword,
} from "./access";

test("unclaimed performers are demo profiles and cannot take bookings", () => {
  assert.equal(REFUSE_BOOKINGS_FOR_UNCLAIMED_PERFORMERS, true);
  assert.equal(isClaimedPerformer({ claimed: false }), false);
  assert.equal(isClaimedPerformer({ claimed: true }), true);
  assert.equal(isClaimedPerformer(null), false);
  assert.equal(bookingsOpenForPerformer({ claimed: false }), false);
  assert.equal(bookingsOpenForPerformer({ claimed: true }), true);
  assert.match(bookingTargetError(null) ?? "", /not found/i);
  assert.match(bookingTargetError({ claimed: false }) ?? "", /demo profile/i);
  assert.equal(bookingTargetError({ claimed: true }), null);
});

test("next paths stay on this site", () => {
  assert.equal(safeNextPath("/gigs/new"), "/gigs/new");
  assert.equal(safeNextPath("https://evil.example/gigs/new?x=1"), "/gigs/new?x=1");
  assert.equal(safeNextPath("//evil.example"), "/");
  assert.equal(safeNextPath("/\\evil.example"), "/");
  assert.equal(safeNextPath("javascript:alert(1)"), "/");
  assert.equal(safeNextPath(null, "/account"), "/account");
  assert.equal(defaultNextForOtp("recovery"), "/reset-password");
  assert.equal(defaultNextForOtp("email"), "/account");
  assert.equal(asOtpType("magiclink"), null);
  assert.equal(asOtpType("signup"), "signup");
  assert.equal(asOtpType("recovery"), "recovery");
});

test("profile and password checks reject empty auth input", () => {
  assert.match(validateEmail("nope") ?? "", /email/i);
  assert.equal(validateEmail("fan@example.com"), null);
  assert.match(validatePassword("short") ?? "", /8/);
  assert.equal(validatePassword("long-enough"), null);
  const missing = parseProfileFields({
    name: "  ",
    category: "solo",
    bio: "",
    city: "",
    genres: "",
    userId: "user-1",
  });
  assert.equal(missing.ok, false);
  const badCategory = parseProfileFields({
    name: "Night Birds",
    category: "orchestra",
    bio: "",
    city: "",
    genres: "jazz, soul",
    userId: "user-1",
  });
  assert.equal(badCategory.ok, false);
  const parsed = parseProfileFields({
    name: " Night Birds ",
    category: "band",
    bio: " horns ",
    city: "",
    genres: "jazz, soul",
    userId: "user-1",
  });
  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.equal(parsed.value.name, "Night Birds");
    assert.equal(parsed.value.city, "Austin, TX");
    assert.deepEqual(parsed.value.genres, ["jazz", "soul"]);
    assert.equal(parsed.value.userId, "user-1");
  }
});
