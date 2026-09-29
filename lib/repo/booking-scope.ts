export function requireBookingPerformerId(performerId: string | undefined | null): string {
  const id = performerId?.trim() ?? "";
  if (!id) {
    throw new Error("Booking requests are only visible to the performer they were sent to.");
  }
  return id;
}
