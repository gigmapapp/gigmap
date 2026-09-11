"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePerformer } from "@/lib/auth";
import { gigs } from "@/lib/repo";
import { CATEGORIES, type Category } from "@/lib/types";

export async function createGigAction(formData: FormData) {
  const performer = await requirePerformer("/gigs/new");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const datetimeLocal = String(formData.get("datetime") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  const lat = Number(formData.get("lat"));
  const lng = Number(formData.get("lng"));
  const categoryRaw = String(formData.get("category") ?? performer.category);

  if (!title) throw new Error("Title is required.");
  if (!datetimeLocal) throw new Error("Date and time are required.");
  if (!label) throw new Error("Location label is required.");
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error("Click the map to drop a pin.");
  }
  if (!(CATEGORIES as readonly string[]).includes(categoryRaw)) {
    throw new Error("Pick a category.");
  }

  const gig = await gigs.create({
    performerId: performer.id,
    title,
    description,
    category: categoryRaw as Category,
    datetime: new Date(datetimeLocal).toISOString(),
    location: { lat, lng, label },
  });

  revalidatePath("/");
  revalidatePath(`/performers/${performer.id}`);
  redirect(`/gigs/${gig.id}`);
}
