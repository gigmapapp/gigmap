"use client";

import { unstable_rethrow } from "next/navigation";
import { useState } from "react";
import { addVideoAction } from "@/app/actions/videos";

export default function AddVideoForm({ performerId }: { performerId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4"
      action={async (formData) => {
        setError(null);
        setPending(true);
        try {
          await addVideoAction(formData);
        } catch (err) {
          unstable_rethrow(err);
          setError(err instanceof Error ? err.message : "Could not add clip.");
        } finally {
          setPending(false);
        }
      }}
    >
      <h2 className="font-display text-lg text-white">Add a short clip</h2>
      <p className="text-xs text-zinc-500">Paste a YouTube/Vimeo/MP4 URL or upload up to 10 MB.</p>
      <input type="hidden" name="performerId" value={performerId} />
      <input
        name="title"
        placeholder="Clip title"
        className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
      />
      <input
        name="url"
        placeholder="https://youtube.com/watch?v=… or a direct MP4"
        className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
      />
      <input
        type="file"
        name="file"
        accept="video/mp4,video/webm,video/quicktime"
        className="w-full text-sm text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-800 file:px-3 file:py-2 file:text-white"
      />
      {error ? <p className="text-sm text-orange-300">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Add clip"}
      </button>
    </form>
  );
}
