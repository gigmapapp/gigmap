import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { authFailure } from "@/lib/auth/result";
import { BOOKING_MESSAGES, BookingStatusError } from "@/lib/bookings/status";
import { changeBookingStatus } from "@/lib/bookings/commands";
import { notifyBookingStatusChanged } from "@/lib/notifications/booking";
import type { BookingRepository } from "@/lib/repo/interface";
import type { BookingRequest } from "@/lib/types";

const root = process.cwd();

function booking(status: BookingRequest["status"] = "pending"): BookingRequest {
  return {
    id: "book-1",
    performerId: "night-birds",
    requesterId: "fan-user",
    contactName: "Jordan",
    contactEmail: "jordan@example.com",
    eventDetails: "Backyard",
    preferredDate: "2026-11-02",
    preferredLocation: "Mystic",
    message: "Hello",
    status,
    createdAt: "2026-10-01T00:00:00.000Z",
    statusChangedAt: "2026-10-01T00:00:00.000Z",
  };
}

test("status actions return the auth result shape and notify after a change", async () => {
  const logs: unknown[][] = [];
  const original = console.info;
  console.info = (...args: unknown[]) => {
    logs.push(args);
  };
  const before = booking("pending");
  const after = booking("accepted");
  after.statusChangedAt = "2026-10-02T00:00:00.000Z";
  let calls = 0;
  const repo: Pick<BookingRepository, "setStatus"> = {
    async setStatus(bookingId, actorUserId, status) {
      calls += 1;
      assert.equal(bookingId, "book-1");
      assert.equal(actorUserId, "owner-user");
      assert.equal(status, "accepted");
      return { before, after };
    },
  };
  try {
    const result = await changeBookingStatus(repo, {
      actorUserId: "owner-user",
      bookingId: " book-1 ",
      status: "accepted",
    });
    assert.deepEqual(result, { ok: true, message: BOOKING_MESSAGES.accepted });
    assert.equal(calls, 1);
    assert.equal(logs.length, 1);
    assert.match(String(logs[0]?.[0]), /booking notification/);
    assert.equal(logs[0]?.[1], "status_changed");
    assert.equal(logs[0]?.[2], "book-1");
    assert.equal(logs[0]?.[3], "accepted");
  } finally {
    console.info = original;
  }
});

test("status actions keep validation failures and hide unexpected errors", async () => {
  const validation = await changeBookingStatus(
    {
      async setStatus() {
        throw new BookingStatusError(BOOKING_MESSAGES.onlyPerformer);
      },
    },
    { actorUserId: "fan-user", bookingId: "book-1", status: "accepted" },
  );
  assert.deepEqual(validation, authFailure("validation", BOOKING_MESSAGES.onlyPerformer));

  const missing = await changeBookingStatus(
    { async setStatus() { throw new Error("unreachable"); } },
    { actorUserId: "", bookingId: "book-1", status: "declined" },
  );
  assert.equal(missing.ok, false);
  if (!missing.ok) assert.equal(missing.message, BOOKING_MESSAGES.signInUpdate);

  const original = console.error;
  console.error = () => undefined;
  try {
    const leaked = await changeBookingStatus(
      {
        async setStatus() {
          throw new Error("password=secret");
        },
      },
      { actorUserId: "owner-user", bookingId: "book-1", status: "declined" },
    );
    assert.equal(leaked.ok, false);
    if (!leaked.ok) {
      assert.equal(leaked.code, "unknown");
      assert.equal(leaked.message, BOOKING_MESSAGES.updateFailed);
      assert.doesNotMatch(leaked.message, /secret/);
    }
  } finally {
    console.error = original;
  }
});

test("booking notification is a log and the actions call it", () => {
  const notice = readFileSync(path.join(root, "lib/notifications/booking.ts"), "utf8");
  const actions = readFileSync(path.join(root, "app/actions/bookings.ts"), "utf8");
  assert.match(notice, /export function notifyBookingStatusChanged/);
  assert.match(notice, /console\.info/);
  assert.doesNotMatch(notice, /resend|nodemailer|smtp|sendEmail|fetch\(/i);
  assert.match(actions, /notifyBookingStatusChanged/);
  assert.match(actions, /acceptBookingAction/);
  assert.match(actions, /declineBookingAction/);
  assert.match(actions, /cancelBookingAction/);
  assert.match(actions, /Promise<AuthActionResult>/);
  assert.match(actions, /changeBookingStatus/);
  assert.match(actions, /getSessionUser/);
  assert.match(actions, /BOOKING_MESSAGES\.signIn/);
  assert.match(actions, /requesterId: user\.id/);
  const logs: unknown[][] = [];
  const original = console.info;
  console.info = (...args: unknown[]) => {
    logs.push(args);
  };
  try {
    notifyBookingStatusChanged({
      type: "created",
      bookingId: "book-9",
      performerId: "night-birds",
      requesterId: "fan-user",
      status: "pending",
    });
  } finally {
    console.info = original;
  }
  assert.equal(logs[0]?.[1], "created");
  assert.equal(logs[0]?.[3], "pending");
});
