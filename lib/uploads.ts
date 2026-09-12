import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const UPLOAD_DIR = path.join(process.cwd(), ".data", "uploads");

const ALLOWED = new Map([
  ["video/mp4", "mp4"],
  ["video/webm", "webm"],
  ["video/quicktime", "mov"],
]);

export async function saveVideoUpload(file: File): Promise<string> {
  const ext = ALLOWED.get(file.type);
  if (!ext) {
    throw new Error("Upload an MP4, WebM, or MOV clip.");
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("Clips must be 10 MB or smaller in v1.");
  }
  await mkdir(UPLOAD_DIR, { recursive: true });
  const filename = `${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOAD_DIR, filename), buffer);
  return `/api/uploads/${filename}`;
}

export function uploadPath(filename: string) {
  if (!/^[a-f0-9-]+\.(mp4|webm|mov)$/i.test(filename)) {
    return null;
  }
  return path.join(UPLOAD_DIR, filename);
}
