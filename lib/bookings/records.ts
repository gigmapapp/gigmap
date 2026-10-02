import { bookingTargetError } from "@/lib/auth/access";
import {
  BOOKING_MESSAGES,
  BookingStatusError,
  decideBookingTransition,
  parseBookingStatus,
} from "@/lib/bookings/status";
import type {
  BookingDecisionStatus,
  BookingRequest,
  BookingStatus,
  CreateBookingInput,
} from "@/lib/types";

type OwnerRow = { id: string; userId: string | null };

export type StoredBookingInput = {
  id: string;
  performerId: string;
  requesterId?: string | null;
  contactName: string;
  contactEmail: string;
  eventDetails: string;
  preferredDate: string;
  preferredLocation: string;
  message?: string;
  status?: string | null;
  createdAt: string;
  statusChangedAt?: string | null;
};

export function normalizeStoredBooking(row: StoredBookingInput): BookingRequest {
  const status: BookingStatus = parseBookingStatus(row.status);
  return {
    id: row.id,
    performerId: row.performerId,
    requesterId: row.requesterId ?? null,
    contactName: row.contactName,
    contactEmail: row.contactEmail,
    eventDetails: row.eventDetails,
    preferredDate: row.preferredDate,
    preferredLocation: row.preferredLocation,
    message: row.message ?? "",
    status,
    createdAt: row.createdAt,
    statusChangedAt: row.statusChangedAt || row.createdAt,
  };
}

export function incomingBookingRequests(
  performers: OwnerRow[],
  bookings: BookingRequest[],
  performerId: string,
  actorUserId: string,
): BookingRequest[] {
  const id = performerId.trim();
  if (!id || !actorUserId) return [];
  const owner = performers.find((performer) => performer.id === id);
  if (!owner || owner.userId !== actorUserId) return [];
  return bookings
    .filter((booking) => booking.performerId === id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function requesterBookingRequests(
  bookings: BookingRequest[],
  requesterId: string,
): BookingRequest[] {
  if (!requesterId) return [];
  return bookings
    .filter((booking) => booking.requesterId === requesterId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function insertBookingRequest(
  performers: OwnerRow[],
  bookings: BookingRequest[],
  input: CreateBookingInput,
  now = new Date(),
): BookingRequest {
  const requesterId = input.requesterId.trim();
  if (!requesterId) throw new Error(BOOKING_MESSAGES.signIn);
  const performer = performers.find((item) => item.id === input.performerId);
  const refusal = bookingTargetError(
    performer ? { claimed: Boolean(performer.userId) } : null,
  );
  if (refusal) throw new Error(refusal);
  const createdAt = now.toISOString();
  const booking: BookingRequest = {
    id: crypto.randomUUID(),
    performerId: input.performerId,
    requesterId,
    contactName: input.contactName.trim(),
    contactEmail: input.contactEmail.trim(),
    eventDetails: input.eventDetails.trim(),
    preferredDate: input.preferredDate,
    preferredLocation: input.preferredLocation.trim(),
    message: input.message.trim(),
    status: "pending",
    createdAt,
    statusChangedAt: createdAt,
  };
  bookings.push(booking);
  return booking;
}

export function transitionBookingRequest(
  performers: OwnerRow[],
  bookings: BookingRequest[],
  input: { bookingId: string; actorUserId: string; status: BookingDecisionStatus },
  now = new Date(),
): { before: BookingRequest; after: BookingRequest } {
  const index = bookings.findIndex((booking) => booking.id === input.bookingId);
  const current = index >= 0 ? bookings[index] : null;
  if (!current) throw new BookingStatusError(BOOKING_MESSAGES.unavailable);
  const owner = performers.find((performer) => performer.id === current.performerId);
  const ownerUserId = owner?.userId ?? null;
  const visible =
    input.actorUserId !== "" &&
    (input.actorUserId === ownerUserId ||
      (current.requesterId !== null && input.actorUserId === current.requesterId));
  if (!visible) throw new BookingStatusError(BOOKING_MESSAGES.unavailable);
  const decision = decideBookingTransition({
    actorUserId: input.actorUserId,
    ownerUserId,
    requesterId: current.requesterId,
    fromStatus: current.status,
    toStatus: input.status,
  });
  if (!decision.ok) throw new BookingStatusError(decision.message);
  const before = { ...current };
  const after: BookingRequest = {
    ...current,
    status: input.status,
    statusChangedAt: now.toISOString(),
  };
  bookings[index] = after;
  return { before, after };
}
