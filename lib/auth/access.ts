import { CATEGORIES, type Category, type CreatePerformerInput } from "@/lib/types";

/**
 * Confirmed: performers with no owner are demo profiles. The Book button is
 * hidden and the booking action refuses them, because nobody could read the
 * request. Claiming a seed profile is out of scope. This constant is the
 * single switch for that rule.
 */
export const REFUSE_BOOKINGS_FOR_UNCLAIMED_PERFORMERS = true;

/** Removed on each request. Not a session. */
export const LEGACY_STUB_COOKIE = "gigmap_performer";

export const MIN_PASSWORD_LENGTH = 8;

export function isClaimedPerformer(performer: { claimed: boolean } | null | undefined): boolean {
  return performer?.claimed === true;
}

export function bookingsOpenForPerformer(performer: { claimed: boolean } | null | undefined): boolean {
  if (!performer) return false;
  if (!REFUSE_BOOKINGS_FOR_UNCLAIMED_PERFORMERS) return true;
  return performer.claimed;
}

export function bookingTargetError(performer: { claimed: boolean } | null | undefined): string | null {
  if (!performer) return "Performer not found.";
  if (!bookingsOpenForPerformer(performer)) {
    return "This demo profile is not accepting booking requests.";
  }
  return null;
}

/**
 * Same-origin path only. Absolute URLs are reduced to their path so an auth
 * email can pass `next` as a full redirect target without becoming an open redirect.
 */
export function safeNextPath(value: string | null | undefined, fallback = "/"): string {
  if (!value) return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;

  const asPath = trimmed.startsWith("/") ? trimmed : pathFromAbsolute(trimmed);
  if (!asPath) return fallback;
  if (!asPath.startsWith("/") || asPath.startsWith("//") || asPath.startsWith("/\\")) return fallback;
  if (asPath.includes("\\") || asPath.includes("://")) return fallback;
  return asPath;
}

function pathFromAbsolute(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return `${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}

export function validateEmail(value: string): string | null {
  const email = value.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid email address.";
  return null;
}

export function validatePassword(value: string): string | null {
  if (value.length < MIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  return null;
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

const OTP_TYPES = ["email", "signup", "recovery", "invite", "email_change"] as const;
export type AllowedOtpType = (typeof OTP_TYPES)[number];

export function asOtpType(value: string | null | undefined): AllowedOtpType | null {
  if (!value) return null;
  return (OTP_TYPES as readonly string[]).includes(value) ? (value as AllowedOtpType) : null;
}

export function defaultNextForOtp(type: AllowedOtpType | null): string {
  return type === "recovery" ? "/reset-password" : "/account";
}

export function parseCategory(value: string): Category | null {
  return (CATEGORIES as readonly string[]).includes(value) ? (value as Category) : null;
}

export function parseProfileFields(input: {
  name: string;
  category: string;
  bio: string;
  city: string;
  genres: string;
  userId: string;
}): { ok: true; value: CreatePerformerInput } | { ok: false; error: string } {
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Name is required." };
  const category = parseCategory(input.category);
  if (!category) return { ok: false, error: "Pick solo, band, or DJ." };
  const userId = input.userId.trim();
  if (!userId) return { ok: false, error: "Sign in to create a profile." };
  return {
    ok: true,
    value: {
      name,
      category,
      bio: input.bio.trim(),
      city: input.city.trim() || "Austin, TX",
      genres: input.genres
        .split(",")
        .map((genre) => genre.trim())
        .filter(Boolean),
      userId,
    },
  };
}

export function authUnavailableMessage(): string {
  return "Accounts need Supabase. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.";
}
