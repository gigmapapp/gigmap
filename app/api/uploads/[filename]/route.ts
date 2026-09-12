import { readFile } from "node:fs/promises";
import { uploadPath } from "@/lib/uploads";

export const dynamic = "force-dynamic";

const TYPES: Record<string, string> = {
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ filename: string }> },
) {
  const { filename } = await context.params;
  const filePath = uploadPath(filename);
  if (!filePath) {
    return new Response("Not found", { status: 404 });
  }
  try {
    const data = await readFile(filePath);
    const ext = filename.split(".").pop()?.toLowerCase() ?? "mp4";
    return new Response(data, {
      headers: {
        "Content-Type": TYPES[ext] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
