"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { bookings } from "@/lib/repo";

export async function createBookingAction(formData: FormData) {
  const performerId = String(formData.get("performerId") ?? "");
  const contactName = String(formData.get("contactName") ?? "").trim();
  const contactEmail = String(formData.get("contactEmail") ?? "").trim();
  const eventDetails = String(formData.get("eventDetails") ?? "").trim();
  const preferredDate = String(formData.get("preferredDate") ?? "");
  const preferredLocation = String(formData.get("preferredLocation") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!performerId) throw new Error("Missing performer.");
  if (!contactName) throw new Error("Name is required.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    throw new Error("Enter a valid email.");
  }
  if (!eventDetails) throw new Error("Tell us about the event.");
  if (!preferredDate) throw new Error("Preferred date is required.");
  if (!preferredLocation) throw new Error("Preferred location is required.");

  const booking = await bookings.create({
    performerId,
    contactName,
    contactEmail,
    eventDetails,
    preferredDate,
    preferredLocation,
    message,
  });

  revalidatePath("/bookings");
  redirect(`/bookings?created=${booking.id}`);
}
