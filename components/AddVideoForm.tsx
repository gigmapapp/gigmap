"use client";

import { unstable_rethrow } from "next/navigation";
import { useState } from "react";
import { addVideoAction, createClipUploadAction } from "@/app/actions/videos";
import { clipExtension, MAX_CLIP_BYTES } from "@/lib/clips";
import { uploadClipToSignedUrl } from "@/lib/upload-clip";

export default function AddVideoForm({
  performerId,
  uploadMode,
}: {
  performerId: string;
  uploadMode: "local" | "signed";
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="space-y-3 rounded-2xl border border-line bg-surface p-4"
      action={async (formData) => {
        setError(null);
        setPending(true);
        try {
          const file = formData.get("file");
          if (uploadMode === "signed" && file instanceof File && file.size > 0) {
            if (!clipExtension(file.type)) {
              throw new Error("Upload an MP4, WebM, or MOV clip.");
            }
            if (file.size > MAX_CLIP_BYTES) {
              throw new Error("Clips must be 10 MB or smaller in v1.");
            }
            const target = await createClipUploadAction({
              performerId,
              contentType: file.type,
              size: file.size,
            });
            await uploadClipToSignedUrl(file, target);
            formData.delete("file");
            formData.set("url", target.publicUrl);
            formData.set("uploaded", "1");
          }
          await addVideoAction(formData);
        } catch (err) {
          unstable_rethrow(err);
          setError(err instanceof Error ? err.message : "Could not add clip.");
        } finally {
          setPending(false);
        }
      }}
    >
      <h2 className="font-display text-lg text-foreground">Add a short clip</h2>
      <p className="text-xs text-muted">
        {uploadMode === "signed"
          ? "Paste a YouTube/Vimeo/MP4 URL, or upload up to 10 MB straight to storage."
          : "Paste a YouTube/Vimeo/MP4 URL or upload up to 10 MB."}
      </p>
      <input type="hidden" name="performerId" value={performerId} />
      <input
        name="title"
        placeholder="Clip title"
        className="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-foreground"
      />
      <input
        name="url"
        placeholder="https://youtube.com/watch?v=… or a direct MP4"
        className="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-foreground"
      />
      <input
        type="file"
        name="file"
        accept="video/mp4,video/webm,video/quicktime"
        className="w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-surface file:px-3 file:py-2 file:text-foreground"
      />
      {error ? <p className="text-sm text-accent">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent hover:bg-accent-hover disabled:opacity-60"
      >
        {pending ? "Saving…" : "Add clip"}
      </button>
    </form>
  );
}
