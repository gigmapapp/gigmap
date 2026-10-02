import assert from "node:assert/strict";
import test from "node:test";
import { BookingStatusError } from "./status";
import {
  incomingBookingRequests,
  insertBookingRequest,
  normalizeStoredBooking,
  requesterBookingRequests,
  transitionBookingRequest,
} from "./records";
import type { BookingRequest } from "@/lib/types";

const OWNER = "owner-user";
const FAN = "fan-user";
const OTHER = "other-user";

const performers = [
  { id: "night-birds", userId: OWNER },
  { id: "demo-act", userId: null },
];

function input(overrides: Partial<Parameters<typeof insertBookingRequest>[2]> = {}) {
  return {
    performerId: "night-birds",
    requesterId: FAN,
    contactName: "Jordan Lee",
    contactEmail: "jordan@example.com",
    eventDetails: "Backyard set",
    preferredDate: "2026-11-02",
    preferredLocation: "Mystic",
    message: "About 40 people.",
    ...overrides,
  };
}

test("json booking records require a signed-in requester and a claimed performer", () => {
  const bookings: BookingRequest[] = [];
  assert.throws(() => insertBookingRequest(performers, bookings, input({ requesterId: "  " })), /sign in/i);
  assert.throws(() => insertBookingRequest(performers, bookings, input({ performerId: "demo-act" })), /demo profile/i);
  assert.throws(() => insertBookingRequest(performers, bookings, input({ performerId: "missing" })), /not found/i);
  assert.equal(bookings.length, 0);

  const created = insertBookingRequest(performers, bookings, input(), new Date("2026-10-02T12:00:00.000Z"));
  assert.equal(created.status, "pending");
  assert.equal(created.requesterId, FAN);
  assert.equal(created.statusChangedAt, created.createdAt);
  assert.equal(created.contactName, "Jordan Lee");
  assert.equal(incomingBookingRequests(performers, bookings, "night-birds", OTHER).length, 0);
  assert.equal(incomingBookingRequests(performers, bookings, "demo-act", OWNER).length, 0);
  assert.deepEqual(
    incomingBookingRequests(performers, bookings, "night-birds", OWNER).map((row) => row.id),
    [created.id],
  );
  assert.deepEqual(
    requesterBookingRequests(bookings, FAN).map((row) => row.id),
    [created.id],
  );
  assert.equal(requesterBookingRequests(bookings, OTHER).length, 0);
});

test("json booking transitions follow owner and requester rules", () => {
  const bookings: BookingRequest[] = [];
  const pending = insertBookingRequest(performers, bookings, input());
  const second = insertBookingRequest(performers, bookings, input({ message: "Second" }));

  assert.throws(
    () =>
      transitionBookingRequest(performers, bookings, {
        bookingId: pending.id,
        actorUserId: FAN,
        status: "accepted",
      }),
    (error: unknown) => error instanceof BookingStatusError && /performer/i.test(error.message),
  );
  assert.equal(bookings.find((row) => row.id === pending.id)?.status, "pending");

  assert.throws(
    () =>
      transitionBookingRequest(performers, bookings, {
        bookingId: pending.id,
        actorUserId: OTHER,
        status: "declined",
      }),
    (error: unknown) => error instanceof BookingStatusError && /not available/i.test(error.message),
  );

  const accepted = transitionBookingRequest(
    performers,
    bookings,
    { bookingId: pending.id, actorUserId: OWNER, status: "accepted" },
    new Date("2026-10-03T15:00:00.000Z"),
  );
  assert.equal(accepted.before.status, "pending");
  assert.equal(accepted.after.status, "accepted");
  assert.equal(accepted.after.statusChangedAt, "2026-10-03T15:00:00.000Z");
  assert.equal(accepted.after.message, pending.message);
  assert.throws(
    () =>
      transitionBookingRequest(performers, bookings, {
        bookingId: pending.id,
        actorUserId: OWNER,
        status: "declined",
      }),
    /pending/i,
  );
  assert.throws(
    () =>
      transitionBookingRequest(performers, bookings, {
        bookingId: pending.id,
        actorUserId: FAN,
        status: "cancelled",
      }),
    /pending/i,
  );

  assert.throws(
    () =>
      transitionBookingRequest(performers, bookings, {
        bookingId: second.id,
        actorUserId: OWNER,
        status: "cancelled",
      }),
    /requester/i,
  );
  const cancelled = transitionBookingRequest(performers, bookings, {
    bookingId: second.id,
    actorUserId: FAN,
    status: "cancelled",
  });
  assert.equal(cancelled.after.status, "cancelled");
  assert.equal(bookings.find((row) => row.id === second.id)?.status, "cancelled");
});

test("stored bookings without a requester stay readable and cannot be cancelled", () => {
  const legacy = normalizeStoredBooking({
    id: "legacy",
    performerId: "night-birds",
    contactName: "Fan",
    contactEmail: "fan@example.com",
    eventDetails: "Party",
    preferredDate: "2026-10-10",
    preferredLocation: "Home",
    createdAt: "2026-10-01T00:00:00.000Z",
  });
  assert.equal(legacy.requesterId, null);
  assert.equal(legacy.status, "pending");
  assert.equal(legacy.statusChangedAt, legacy.createdAt);
  const bookings = [legacy];
  assert.equal(incomingBookingRequests(performers, bookings, "night-birds", OWNER)[0]?.id, "legacy");
  assert.throws(
    () =>
      transitionBookingRequest(performers, bookings, {
        bookingId: "legacy",
        actorUserId: FAN,
        status: "cancelled",
      }),
    /not available|requester/i,
  );
  const declined = transitionBookingRequest(performers, bookings, {
    bookingId: "legacy",
    actorUserId: OWNER,
    status: "declined",
  });
  assert.equal(declined.after.status, "declined");
});
