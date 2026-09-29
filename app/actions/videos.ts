"use server";

import { revalidatePath } from "next/cache";
import { requirePerformer } from "@/lib/auth";
import { clipExtension, MAX_CLIP_BYTES } from "@/lib/clips";
import { performers, isSupabaseConfigured } from "@/lib/repo";
import { createClipUploadTarget } from "@/lib/repo/supabase";
import { saveVideoUpload } from "@/lib/uploads";

async function assertOwnPerformer(performerId: string) {
  const session = await requirePerformer(`/performers/${performerId}`);
  if (session.id !== performerId) {
    throw new Error("You can only add clips to the performer you are acting as.");
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(performerId)) {
    throw new Error("Unknown performer");
  }
  return session;
}

export async function createClipUploadAction(input: {
  performerId: string;
  contentType: string;
  size: number;
}): Promise<{ path: string; token: string; publicUrl: string }> {
  const performerId = input.performerId;
  await assertOwnPerformer(performerId);
  if (!isSupabaseConfigured()) {
    throw new Error("Direct clip upload requires Supabase.");
  }
  const extension = clipExtension(input.contentType);
  if (!extension) {
    throw new Error("Upload an MP4, WebM, or MOV clip.");
  }
  if (!Number.isFinite(input.size) || input.size <= 0 || input.size > MAX_CLIP_BYTES) {
    throw new Error("Clips must be 10 MB or smaller in v1.");
  }
  const performer = await performers.get(performerId);
  if (!performer) throw new Error("Performer not found");
  return createClipUploadTarget({ performerId, extension });
}

export async function addVideoAction(formData: FormData) {
  const performerId = String(formData.get("performerId") ?? "");
  await assertOwnPerformer(performerId);

  const title = String(formData.get("title") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  const file = formData.get("file");
  const uploaded = formData.get("uploaded") === "1";

  if (file instanceof File && file.size > 0) {
    if (isSupabaseConfigured()) {
      throw new Error("Upload the clip directly to storage. The app server does not accept the file.");
    }
    const stored = await saveVideoUpload(file);
    await performers.addVideo(performerId, {
      title,
      sourceType: "upload",
      url: stored,
    });
  } else if (url) {
    await performers.addVideo(performerId, {
      title,
      sourceType: uploaded ? "upload" : "url",
      url,
    });
  } else {
    throw new Error("Add a video URL or upload a short clip.");
  }

  revalidatePath(`/performers/${performerId}`);
}
