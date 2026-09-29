export const BOOKING_FIELDS = [
  "contactName",
  "contactEmail",
  "eventDetails",
  "preferredDate",
  "preferredLocation",
] as const;

export type BookingField = (typeof BOOKING_FIELDS)[number];

export type BookingFieldErrors = Partial<Record<BookingField, string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type BookingFieldInput = {
  contactName: string;
  contactEmail: string;
  eventDetails: string;
  preferredDate: string;
  preferredLocation: string;
};

export function bookingFieldsFromForm(formData: FormData): BookingFieldInput {
  return {
    contactName: String(formData.get("contactName") ?? ""),
    contactEmail: String(formData.get("contactEmail") ?? ""),
    eventDetails: String(formData.get("eventDetails") ?? ""),
    preferredDate: String(formData.get("preferredDate") ?? ""),
    preferredLocation: String(formData.get("preferredLocation") ?? ""),
  };
}

/** Shared by the booking form and createBookingAction so both report the same messages. */
export function validateBookingFields(input: BookingFieldInput): BookingFieldErrors {
  const errors: BookingFieldErrors = {};
  if (!input.contactName.trim()) errors.contactName = "Name is required.";
  if (!EMAIL.test(input.contactEmail.trim())) errors.contactEmail = "Enter a valid email.";
  if (!input.eventDetails.trim()) errors.eventDetails = "Tell us about the event.";
  if (!input.preferredDate) errors.preferredDate = "Preferred date is required.";
  if (!input.preferredLocation.trim()) errors.preferredLocation = "Preferred location is required.";
  return errors;
}

export function firstBookingField(errors: BookingFieldErrors): BookingField | null {
  return BOOKING_FIELDS.find((field) => errors[field]) ?? null;
}

export function hasBookingErrors(errors: BookingFieldErrors) {
  return firstBookingField(errors) !== null;
}
