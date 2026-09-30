"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseProfileFields, safeNextPath } from "@/lib/auth/access";
import { requireUser } from "@/lib/auth/session";
import { performers } from "@/lib/repo";

export async function createProfileAction(formData: FormData) {
  const user = await requireUser("/account");
  const existing = await performers.getByUserId(user.id);
  if (existing) redirect(`/performers/${existing.id}`);

  const parsed = parseProfileFields({
    name: String(formData.get("name") ?? ""),
    category: String(formData.get("category") ?? ""),
    bio: String(formData.get("bio") ?? ""),
    city: String(formData.get("city") ?? ""),
    genres: String(formData.get("genres") ?? ""),
    userId: user.id,
  });
  if (!parsed.ok) throw new Error(parsed.error);

  const performer = await performers.create(parsed.value);
  revalidatePath("/", "layout");
  const next = safeNextPath(String(formData.get("next") ?? ""), `/performers/${performer.id}`);
  redirect(next === "/" ? `/performers/${performer.id}` : next);
}
