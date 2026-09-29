import assert from "node:assert/strict";
import test from "node:test";
import { requireBookingPerformerId } from "./booking-scope";

test("booking reads require a performer id", () => {
  assert.equal(requireBookingPerformerId("maya-chen"), "maya-chen");
  assert.throws(() => requireBookingPerformerId(""), /only visible to the performer/);
  assert.throws(() => requireBookingPerformerId("   "), /only visible to the performer/);
  assert.throws(() => requireBookingPerformerId(undefined), /only visible to the performer/);
});
