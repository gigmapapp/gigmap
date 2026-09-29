export const CLIPS_BUCKET = "clips";

/** Matches the Storage bucket file_size_limit. Kept under a typical phone clip, not the Vercel body cap. */
export const MAX_CLIP_BYTES = 10 * 1024 * 1024;

const ALLOWED = new Map([
  ["video/mp4", "mp4"],
  ["video/webm", "webm"],
  ["video/quicktime", "mov"],
]);

export function clipExtension(contentType: string): string | null {
  return ALLOWED.get(contentType) ?? null;
}
