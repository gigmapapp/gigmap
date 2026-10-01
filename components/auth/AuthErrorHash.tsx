"use client";

import { useEffect } from "react";
import { authErrorPath, authLinkFailureFromParams } from "@/lib/auth/link";

/** Supabase puts the same error fields in the hash. The server only sees the query. */
export default function AuthErrorHash() {
  useEffect(() => {
    const current = new URLSearchParams(window.location.search);
    if (current.get("error") || current.get("error_code") || current.get("error_description")) return;
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) return;
    const failure = authLinkFailureFromParams(new URLSearchParams(hash));
    if (!failure) return;
    window.location.replace(authErrorPath(failure));
  }, []);
  return null;
}
