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

const PERFORMER_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Storage object key. Always `{performerId}/{uuid}.{ext}` so clips cannot escape that prefix. */
export function clipObjectPath(performerId: string, extension: string): string {
  if (!PERFORMER_ID.test(performerId) || performerId.length > 80) {
    throw new Error("Unknown performer");
  }
  if (!/^(mp4|webm|mov)$/.test(extension)) {
    throw new Error("Upload an MP4, WebM, or MOV clip.");
  }
  return `${performerId}/${crypto.randomUUID()}.${extension}`;
}
