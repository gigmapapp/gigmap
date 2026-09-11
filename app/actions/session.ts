"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { setSessionPerformerId } from "@/lib/auth";
import { performers } from "@/lib/repo";

function safeNext(value: FormDataEntryValue | null) {
  const next = typeof value === "string" ? value : "/";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export async function pickPerformerAction(formData: FormData) {
  const id = String(formData.get("performerId") ?? "");
  const performer = await performers.get(id);
  if (!performer) {
    throw new Error("Unknown performer");
  }
  await setSessionPerformerId(performer.id);
  revalidatePath("/", "layout");
  redirect(safeNext(formData.get("next")));
}

export async function clearSessionAction(formData: FormData) {
  await setSessionPerformerId(null);
  revalidatePath("/", "layout");
  redirect(safeNext(formData.get("next")));
}
