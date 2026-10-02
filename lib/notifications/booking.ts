import type { BookingDecisionStatus, BookingStatus } from "@/lib/types";

/**
 * Placeholder for booking email. Logs the change and does not send mail.
 * The next step can replace the body of this function.
 */
export type BookingNotification =
  | {
      type: "created";
      bookingId: string;
      performerId: string;
      requesterId: string;
      status: "pending";
    }
  | {
      type: "status_changed";
      bookingId: string;
      performerId: string;
      requesterId: string | null;
      status: BookingDecisionStatus;
      previousStatus: BookingStatus;
    };

export function notifyBookingStatusChanged(event: BookingNotification): void {
  console.info("[gigmap] booking notification", event.type, event.bookingId, event.status);
}
