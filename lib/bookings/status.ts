import type { BookingDecisionStatus, BookingStatus } from "@/lib/types";

export const BOOKING_MESSAGES = {
  signIn: "Sign in to request a booking.",
  signInUpdate: "Sign in to update this request.",
  unavailable: "That request is not available.",
  onlyPerformer: "Only the performer can accept or decline a request.",
  onlyRequester: "Only the requester can cancel a request.",
  onlyPendingDecision: "Only a pending request can be accepted or declined.",
  onlyPendingCancel: "Only a pending request can be cancelled.",
  unchanged: "That request can no longer be changed.",
  updateFailed: "Could not update that request.",
  accepted: "Request accepted.",
  declined: "Request declined.",
  cancelled: "Request cancelled.",
} as const;

export class BookingStatusError extends Error {
  readonly failure = "validation" as const;

  constructor(message: string) {
    super(message);
    this.name = "BookingStatusError";
  }
}

export function parseBookingStatus(value: string | null | undefined): BookingStatus {
  if (value === "accepted" || value === "declined" || value === "cancelled" || value === "pending") {
    return value;
  }
  return "pending";
}

export function bookingStatusMessage(status: BookingDecisionStatus): string {
  switch (status) {
    case "accepted":
      return BOOKING_MESSAGES.accepted;
    case "declined":
      return BOOKING_MESSAGES.declined;
    case "cancelled":
      return BOOKING_MESSAGES.cancelled;
  }
}

/**
 * Who may move a request, and from which status. The database trigger repeats
 * these rules so a direct update cannot skip them.
 */
export function decideBookingTransition(input: {
  actorUserId: string;
  ownerUserId: string | null;
  requesterId: string | null;
  fromStatus: BookingStatus;
  toStatus: BookingDecisionStatus;
}): { ok: true } | { ok: false; message: string } {
  if (!input.actorUserId) {
    return { ok: false, message: BOOKING_MESSAGES.signInUpdate };
  }
  if (input.fromStatus !== "pending") {
    return {
      ok: false,
      message:
        input.toStatus === "cancelled"
          ? BOOKING_MESSAGES.onlyPendingCancel
          : BOOKING_MESSAGES.onlyPendingDecision,
    };
  }
  if (input.toStatus === "cancelled") {
    if (!input.requesterId || input.actorUserId !== input.requesterId) {
      return { ok: false, message: BOOKING_MESSAGES.onlyRequester };
    }
    return { ok: true };
  }
  if (!input.ownerUserId || input.actorUserId !== input.ownerUserId) {
    return { ok: false, message: BOOKING_MESSAGES.onlyPerformer };
  }
  return { ok: true };
}
