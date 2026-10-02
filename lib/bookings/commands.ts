import type { BookingRepository } from "@/lib/repo/interface";
import { authFailure, type AuthActionResult } from "@/lib/auth/result";
import {
  BOOKING_MESSAGES,
  BookingStatusError,
  bookingStatusMessage,
} from "@/lib/bookings/status";
import { notifyBookingStatusChanged } from "@/lib/notifications/booking";
import type { BookingDecisionStatus } from "@/lib/types";

type StatusRepo = Pick<BookingRepository, "setStatus">;

export async function changeBookingStatus(
  bookings: StatusRepo,
  input: { actorUserId: string; bookingId: string; status: BookingDecisionStatus },
): Promise<AuthActionResult> {
  const bookingId = input.bookingId.trim();
  if (!input.actorUserId) return authFailure("validation", BOOKING_MESSAGES.signInUpdate);
  if (!bookingId) return authFailure("validation", "Missing booking request.");

  try {
    const { before, after } = await bookings.setStatus(bookingId, input.actorUserId, input.status);
    notifyBookingStatusChanged({
      type: "status_changed",
      bookingId: after.id,
      performerId: after.performerId,
      requesterId: after.requesterId,
      status: input.status,
      previousStatus: before.status,
    });
    return { ok: true, message: bookingStatusMessage(input.status) };
  } catch (error) {
    if (error instanceof BookingStatusError) {
      return authFailure("validation", error.message);
    }
    console.error("Could not update booking request.", error);
    return authFailure("unknown", BOOKING_MESSAGES.updateFailed);
  }
}
