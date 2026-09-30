import { parseCategory } from "@/lib/auth/access";
import {
  profileValidationFailure,
  type ProfileActionFailure,
  type ProfileFieldErrors,
} from "@/lib/auth/result";
import type { Category } from "@/lib/types";

/** Columns an owner may change. id and user_id are not in this object. */
export type ProfileUpdateColumns = {
  name: string;
  category: Category;
  bio: string;
  city: string;
  genres: string[];
};

export type OwnedPerformerRow = ProfileUpdateColumns & {
  id: string;
  userId: string | null;
};

export function profileFieldsFromForm(formData: FormData) {
  return {
    name: String(formData.get("name") ?? ""),
    category: String(formData.get("category") ?? ""),
    bio: String(formData.get("bio") ?? ""),
    city: String(formData.get("city") ?? ""),
    genres: String(formData.get("genres") ?? ""),
  };
}

export function collectProfileFieldErrors(input: { name: string; category: string }): ProfileFieldErrors {
  const errors: ProfileFieldErrors = {};
  if (!input.name.trim()) errors.name = "Name is required.";
  if (!parseCategory(input.category)) errors.category = "Pick solo, band, or DJ.";
  return errors;
}

export function profileUpdateColumns(input: {
  name: string;
  category: string;
  bio: string;
  city: string;
  genres: string;
}): ProfileUpdateColumns | null {
  const category = parseCategory(input.category);
  const name = input.name.trim();
  if (!name || !category) return null;
  return {
    name,
    category,
    bio: input.bio.trim(),
    city: input.city.trim() || "Austin, TX",
    genres: input.genres
      .split(",")
      .map((genre) => genre.trim())
      .filter(Boolean),
  };
}

export function profileSaveFailure(input: {
  name: string;
  category: string;
}): ProfileActionFailure | null {
  const fieldErrors = collectProfileFieldErrors(input);
  if (Object.keys(fieldErrors).length === 0) return null;
  return profileValidationFailure(fieldErrors);
}

/**
 * Applies a profile patch only when actorUserId owns that row.
 * Another user's id, a demo row, and the slug / user id are left as they were.
 */
export function updateOwnedPerformer(
  rows: OwnedPerformerRow[],
  actorUserId: string,
  performerId: string,
  patch: ProfileUpdateColumns,
): { rows: OwnedPerformerRow[]; updated: boolean } {
  let updated = false;
  const next = rows.map((row) => {
    if (row.id !== performerId || !row.userId || row.userId !== actorUserId) return row;
    updated = true;
    return {
      ...row,
      name: patch.name,
      category: patch.category,
      bio: patch.bio,
      city: patch.city,
      genres: patch.genres,
    };
  });
  return { rows: next, updated };
}
