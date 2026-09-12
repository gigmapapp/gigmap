"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { setSessionPerformerId } from "@/lib/auth";
import { performers } from "@/lib/repo";
import { CATEGORIES, type Category } from "@/lib/types";

function asCategory(value: FormDataEntryValue | null): Category {
  const raw = String(value ?? "");
  if ((CATEGORIES as readonly string[]).includes(raw)) {
    return raw as Category;
  }
  throw new Error("Pick solo, band, or DJ.");
}

export async function createPerformerAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Name is required.");

  const performer = await performers.create({
    name,
    category: asCategory(formData.get("category")),
    bio: String(formData.get("bio") ?? ""),
    city: String(formData.get("city") ?? "Austin, TX"),
    genres: String(formData.get("genres") ?? "")
      .split(",")
      .map((genre) => genre.trim())
      .filter(Boolean),
  });

  await setSessionPerformerId(performer.id);
  revalidatePath("/", "layout");
  redirect(`/performers/${performer.id}`);
}
