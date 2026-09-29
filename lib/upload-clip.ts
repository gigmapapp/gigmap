import { createClient } from "@supabase/supabase-js";
import { CLIPS_BUCKET } from "@/lib/clips";

export async function uploadClipToSignedUrl(
  file: File,
  target: { path: string; token: string },
): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to upload clips.",
    );
  }
  const supabase = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  const body = await file.arrayBuffer();
  const { error } = await supabase.storage.from(CLIPS_BUCKET).uploadToSignedUrl(target.path, target.token, body, {
    contentType: file.type,
    upsert: false,
  });
  if (error) {
    throw new Error(error.message || "Could not upload clip.");
  }
}
