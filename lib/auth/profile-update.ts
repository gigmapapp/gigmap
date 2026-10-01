import { parseCategory } from "@/lib/auth/access";
import {
  profileValidationFailure,
  type ProfileActionFailure,
  type ProfileFieldErrors,
} from "@/lib/auth/result";
import type { Category, CreatePerformerInput } from "@/lib/types";

/** Shared by the profile action and the account form. */
export const PROFILE_LIMITS = {
  nameMaxLength: 80,
  bioMaxLength: 500,
  cityMaxLength: 80,
  genreMaxLength: 32,
  genreMaxCount: 8,
} as const;

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

export function collectProfileFieldErrors(input: {
  name: string;
  category: string;
  bio: string;
  city: string;
  genres: string;
}): ProfileFieldErrors {
  const errors: ProfileFieldErrors = {};
  const name = input.name.trim();
  if (!name) errors.name = "Name is required.";
  else if (name.length > PROFILE_LIMITS.nameMaxLength) {
    errors.name = `Name must be ${PROFILE_LIMITS.nameMaxLength} characters or less.`;
  }
  if (!parseCategory(input.category)) errors.category = "Pick solo, band, or DJ.";
  const bio = input.bio.trim();
  if (bio.length > PROFILE_LIMITS.bioMaxLength) {
    errors.bio = `Bio must be ${PROFILE_LIMITS.bioMaxLength} characters or less.`;
  }
  const city = input.city.trim();
  if (!city) errors.city = "City is required.";
  else if (city.length > PROFILE_LIMITS.cityMaxLength) {
    errors.city = `City must be ${PROFILE_LIMITS.cityMaxLength} characters or less.`;
  }
  const genres = parseGenreList(input.genres);
  if (genres.error) errors.genres = genres.error;
  return errors;
}

/** Comma-separated, trimmed, and deduped without regard to case. */
export function parseGenreList(value: string): { genres: string[]; error: string | null } {
  const seen = new Set<string>();
  const genres: string[] = [];
  for (const part of value.split(",")) {
    const genre = part.trim();
    if (!genre) continue;
    if (genre.length > PROFILE_LIMITS.genreMaxLength) {
      return {
        genres: [],
        error: `Each genre must be ${PROFILE_LIMITS.genreMaxLength} characters or less.`,
      };
    }
    const key = genre.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    genres.push(genre);
  }
  if (genres.length > PROFILE_LIMITS.genreMaxCount) {
    return { genres: [], error: `List at most ${PROFILE_LIMITS.genreMaxCount} genres.` };
  }
  return { genres, error: null };
}

export function profileUpdateColumns(input: {
  name: string;
  category: string;
  bio: string;
  city: string;
  genres: string;
}): ProfileUpdateColumns | null {
  if (Object.keys(collectProfileFieldErrors(input)).length > 0) return null;
  const category = parseCategory(input.category);
  const genres = parseGenreList(input.genres);
  if (!category || genres.error) return null;
  return {
    name: input.name.trim(),
    category,
    bio: input.bio.trim(),
    city: input.city.trim(),
    genres: genres.genres,
  };
}

export function profileSaveFailure(input: {
  name: string;
  category: string;
  bio: string;
  city: string;
  genres: string;
}): ProfileActionFailure | null {
  const fieldErrors = collectProfileFieldErrors(input);
  if (Object.keys(fieldErrors).length === 0) return null;
  return profileValidationFailure(fieldErrors);
}

export function parseProfileFields(input: {
  name: string;
  category: string;
  bio: string;
  city: string;
  genres: string;
  userId: string;
}): { ok: true; value: CreatePerformerInput } | { ok: false; error: string } {
  const userId = input.userId.trim();
  if (!userId) return { ok: false, error: "Sign in to create a profile." };
  const invalid = profileSaveFailure(input);
  if (invalid) {
    const field = (["name", "category", "bio", "city", "genres"] as const).find(
      (name) => invalid.fieldErrors[name],
    );
    return { ok: false, error: (field && invalid.fieldErrors[field]) || invalid.formError || "Check the profile fields." };
  }
  const columns = profileUpdateColumns(input);
  if (!columns) return { ok: false, error: "Check the profile fields." };
  return { ok: true, value: { ...columns, userId } };
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
