"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { bookingTargetError } from "@/lib/auth/access";
import { type AuthActionResult } from "@/lib/auth/result";
import { BOOKING_MESSAGES } from "@/lib/bookings/status";
import { changeBookingStatus } from "@/lib/bookings/commands";
import {
  bookingFieldsFromForm,
  hasBookingErrors,
  validateBookingFields,
  type BookingFieldErrors,
} from "@/lib/booking-validation";
import { notifyBookingStatusChanged } from "@/lib/notifications/booking";
import { bookings, performers } from "@/lib/repo";
import { getSessionUser } from "@/lib/auth/session";
import type { BookingDecisionStatus } from "@/lib/types";

export type BookingActionState = {
  ok: false;
  fieldErrors: BookingFieldErrors;
  formError?: string;
};

export async function createBookingAction(formData: FormData): Promise<BookingActionState> {
  const performerId = String(formData.get("performerId") ?? "");
  const fields = bookingFieldsFromForm(formData);
  const message = String(formData.get("message") ?? "").trim();

  if (!performerId) {
    return { ok: false, fieldErrors: {}, formError: "Missing performer." };
  }

  const fieldErrors = validateBookingFields(fields);
  if (hasBookingErrors(fieldErrors)) {
    return { ok: false, fieldErrors };
  }

  const user = await getSessionUser();
  if (!user) {
    return { ok: false, fieldErrors: {}, formError: BOOKING_MESSAGES.signIn };
  }

  const performer = await performers.get(performerId);
  const refusal = bookingTargetError(performer);
  if (refusal) {
    return { ok: false, fieldErrors: {}, formError: refusal };
  }

  const booking = await bookings.create({
    performerId,
    requesterId: user.id,
    contactName: fields.contactName.trim(),
    contactEmail: fields.contactEmail.trim(),
    eventDetails: fields.eventDetails.trim(),
    preferredDate: fields.preferredDate,
    preferredLocation: fields.preferredLocation.trim(),
    message,
  });

  notifyBookingStatusChanged({
    type: "created",
    bookingId: booking.id,
    performerId: booking.performerId,
    requesterId: booking.requesterId ?? user.id,
    status: "pending",
  });

  revalidatePath("/bookings");
  revalidatePath("/account");
  redirect(`/bookings?created=${booking.id}`);
}

async function setStatusAction(
  formData: FormData,
  status: BookingDecisionStatus,
): Promise<AuthActionResult> {
  const user = await getSessionUser();
  const result = await changeBookingStatus(bookings, {
    actorUserId: user?.id ?? "",
    bookingId: String(formData.get("bookingId") ?? ""),
    status,
  });
  if (result.ok) {
    revalidatePath("/account");
    revalidatePath("/bookings");
  }
  return result;
}

export async function acceptBookingAction(formData: FormData): Promise<AuthActionResult> {
  return setStatusAction(formData, "accepted");
}

export async function declineBookingAction(formData: FormData): Promise<AuthActionResult> {
  return setStatusAction(formData, "declined");
}

export async function cancelBookingAction(formData: FormData): Promise<AuthActionResult> {
  return setStatusAction(formData, "cancelled");
}
