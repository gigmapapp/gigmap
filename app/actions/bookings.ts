"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { bookingTargetError } from "@/lib/auth/access";
import {
  bookingFieldsFromForm,
  hasBookingErrors,
  validateBookingFields,
  type BookingFieldErrors,
} from "@/lib/booking-validation";
import { bookings, performers } from "@/lib/repo";

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

  const performer = await performers.get(performerId);
  const refusal = bookingTargetError(performer);
  if (refusal) {
    return { ok: false, fieldErrors: {}, formError: refusal };
  }

  const booking = await bookings.create({
    performerId,
    contactName: fields.contactName.trim(),
    contactEmail: fields.contactEmail.trim(),
    eventDetails: fields.eventDetails.trim(),
    preferredDate: fields.preferredDate,
    preferredLocation: fields.preferredLocation.trim(),
    message,
  });

  revalidatePath("/bookings");
  redirect(`/bookings?created=${booking.id}`);
}
