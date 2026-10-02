import assert from "node:assert/strict";
import test from "node:test";
import { BOOKING_MESSAGES, decideBookingTransition, parseBookingStatus } from "./status";

const OWNER = "owner-user";
const FAN = "fan-user";

test("only a pending request can be accepted or declined, and only by the owner", () => {
  assert.deepEqual(
    decideBookingTransition({
      actorUserId: OWNER,
      ownerUserId: OWNER,
      requesterId: FAN,
      fromStatus: "pending",
      toStatus: "accepted",
    }),
    { ok: true },
  );
  assert.deepEqual(
    decideBookingTransition({
      actorUserId: OWNER,
      ownerUserId: OWNER,
      requesterId: FAN,
      fromStatus: "pending",
      toStatus: "declined",
    }),
    { ok: true },
  );
  assert.equal(
    decideBookingTransition({
      actorUserId: FAN,
      ownerUserId: OWNER,
      requesterId: FAN,
      fromStatus: "pending",
      toStatus: "accepted",
    }).ok,
    false,
  );
  const declined = decideBookingTransition({
    actorUserId: FAN,
    ownerUserId: OWNER,
    requesterId: FAN,
    fromStatus: "pending",
    toStatus: "declined",
  });
  assert.equal(declined.ok, false);
  if (!declined.ok) assert.equal(declined.message, BOOKING_MESSAGES.onlyPerformer);

  for (const fromStatus of ["accepted", "declined", "cancelled"] as const) {
    const again = decideBookingTransition({
      actorUserId: OWNER,
      ownerUserId: OWNER,
      requesterId: FAN,
      fromStatus,
      toStatus: "accepted",
    });
    assert.equal(again.ok, false);
    if (!again.ok) assert.equal(again.message, BOOKING_MESSAGES.onlyPendingDecision);
  }
});

test("only the requester can cancel, and only while pending", () => {
  assert.deepEqual(
    decideBookingTransition({
      actorUserId: FAN,
      ownerUserId: OWNER,
      requesterId: FAN,
      fromStatus: "pending",
      toStatus: "cancelled",
    }),
    { ok: true },
  );
  const ownerCancel = decideBookingTransition({
    actorUserId: OWNER,
    ownerUserId: OWNER,
    requesterId: FAN,
    fromStatus: "pending",
    toStatus: "cancelled",
  });
  assert.equal(ownerCancel.ok, false);
  if (!ownerCancel.ok) assert.equal(ownerCancel.message, BOOKING_MESSAGES.onlyRequester);

  const missingRequester = decideBookingTransition({
    actorUserId: FAN,
    ownerUserId: OWNER,
    requesterId: null,
    fromStatus: "pending",
    toStatus: "cancelled",
  });
  assert.equal(missingRequester.ok, false);
  if (!missingRequester.ok) assert.equal(missingRequester.message, BOOKING_MESSAGES.onlyRequester);

  const late = decideBookingTransition({
    actorUserId: FAN,
    ownerUserId: OWNER,
    requesterId: FAN,
    fromStatus: "accepted",
    toStatus: "cancelled",
  });
  assert.equal(late.ok, false);
  if (!late.ok) assert.equal(late.message, BOOKING_MESSAGES.onlyPendingCancel);
});

test("a performer cannot accept a request for an unowned or demo profile", () => {
  const unowned = decideBookingTransition({
    actorUserId: OWNER,
    ownerUserId: "someone-else",
    requesterId: FAN,
    fromStatus: "pending",
    toStatus: "accepted",
  });
  assert.equal(unowned.ok, false);
  const demo = decideBookingTransition({
    actorUserId: OWNER,
    ownerUserId: null,
    requesterId: FAN,
    fromStatus: "pending",
    toStatus: "declined",
  });
  assert.equal(demo.ok, false);
  if (!demo.ok) assert.equal(demo.message, BOOKING_MESSAGES.onlyPerformer);
  assert.equal(parseBookingStatus("nope"), "pending");
  assert.equal(parseBookingStatus("accepted"), "accepted");
});
