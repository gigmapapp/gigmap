"use server";

import { revalidatePath } from "next/cache";
import { requirePerformer } from "@/lib/auth";
import { performers } from "@/lib/repo";
import { saveVideoUpload } from "@/lib/uploads";

export async function addVideoAction(formData: FormData) {
  const performerId = String(formData.get("performerId") ?? "");
  const session = await requirePerformer(`/performers/${performerId}`);
  if (session.id !== performerId) {
    throw new Error("You can only add clips to the performer you are acting as.");
  }

  const title = String(formData.get("title") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  const file = formData.get("file");

  if (file instanceof File && file.size > 0) {
    const uploaded = await saveVideoUpload(file);
    await performers.addVideo(performerId, {
      title,
      sourceType: "upload",
      url: uploaded,
    });
  } else if (url) {
    await performers.addVideo(performerId, {
      title,
      sourceType: "url",
      url,
    });
  } else {
    throw new Error("Add a video URL or upload a short clip.");
  }

  revalidatePath(`/performers/${performerId}`);
}
