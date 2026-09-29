import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { clipExtension, MAX_CLIP_BYTES } from "@/lib/clips";

const UPLOAD_DIR = path.join(process.cwd(), ".data", "uploads");

export async function saveVideoUpload(file: File): Promise<string> {
  const ext = clipExtension(file.type);
  if (!ext) {
    throw new Error("Upload an MP4, WebM, or MOV clip.");
  }
  if (file.size > MAX_CLIP_BYTES) {
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
