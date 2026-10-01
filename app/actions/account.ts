"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { safeNextPath } from "@/lib/auth/access";
import { profileFieldsFromForm, profileSaveFailure, profileUpdateColumns } from "@/lib/auth/profile-update";
import { type ProfileActionResult, profileAlreadyExistsFailure, profileFormFailure } from "@/lib/auth/result";
import { requireUser } from "@/lib/auth/session";
import { performers } from "@/lib/repo";

function savedProfileFailure(error: unknown): ProfileActionResult {
  const message = error instanceof Error ? error.message : "Could not save profile.";
  return profileFormFailure(message);
}

export async function createProfileAction(formData: FormData): Promise<ProfileActionResult> {
  const user = await requireUser("/account");
  const existing = await performers.getByUserId(user.id);
  if (existing) return profileAlreadyExistsFailure();

  const fields = profileFieldsFromForm(formData);
  const invalid = profileSaveFailure(fields);
  if (invalid) return invalid;
  const columns = profileUpdateColumns(fields);
  if (!columns) return profileFormFailure("Check the profile fields.", "validation");

  let performer;
  try {
    performer = await performers.create({ ...columns, userId: user.id });
  } catch (error) {
    return savedProfileFailure(error);
  }

  revalidatePath("/", "layout");
  const next = safeNextPath(String(formData.get("next") ?? ""), `/performers/${performer.id}`);
  redirect(next === "/" ? `/performers/${performer.id}` : next);
}

export async function updateProfileAction(formData: FormData): Promise<ProfileActionResult> {
  const user = await requireUser("/account");
  const existing = await performers.getByUserId(user.id);
  if (!existing) return profileFormFailure("Create a profile before editing it.");

  const fields = profileFieldsFromForm(formData);
  const invalid = profileSaveFailure(fields);
  if (invalid) return invalid;
  const columns = profileUpdateColumns(fields);
  if (!columns) return profileFormFailure("Check the profile fields.", "validation");

  let performer;
  try {
    performer = await performers.update(existing.id, user.id, columns);
  } catch (error) {
    return savedProfileFailure(error);
  }
  if (!performer) return profileFormFailure("You can only edit your own profile.");

  revalidatePath("/", "layout");
  revalidatePath(`/performers/${performer.id}`);
  redirect("/account");
}
