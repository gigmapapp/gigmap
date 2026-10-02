/**
 * How a gig title and performer name should appear together.
 *
 * `primary` is the heading. `secondary` is the performer line, or null when
 * that line would repeat the heading (or there is no separate performer text).
 * Callers that already show "Unknown" for a missing performer should keep
 * doing that when `secondary` is not null.
 */
export type GigDisplayTitle = {
  primary: string;
  secondary: string | null;
};

const APOSTROPHES = /[\u2018\u2019\u201A\u201B\u2032\u2035\u02BC\u02B9\uFF07]/g;

/** Shared label for a missing performer. Call sites already use this word. */
export const MISSING_PERFORMER_LABEL = "Unknown";

function canonicalGigLabel(value: string): string {
  return value
    .normalize("NFKC")
    .replace(APOSTROPHES, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("en-US");
}

export function gigDisplayTitle(
  title: string | null | undefined,
  performerName: string | null | undefined,
): GigDisplayTitle {
  const titleText = title ?? "";
  const performerText = performerName ?? "";
  const titleKey = canonicalGigLabel(titleText);
  const performerKey = canonicalGigLabel(performerText);

  if (!titleKey && !performerKey) {
    return { primary: "", secondary: null };
  }
  if (titleKey && titleKey === performerKey) {
    return { primary: performerText.trim() || titleText.trim(), secondary: null };
  }
  if (!titleKey) {
    return { primary: performerText.trim(), secondary: null };
  }
  return { primary: titleText, secondary: performerText };
}

/** Accessible name for a single-gig pin. Omits a repeated performer. */
export function gigMarkerLabel(
  title: string | null | undefined,
  performerName: string | null | undefined,
): string {
  const display = gigDisplayTitle(title, performerName);
  if (display.secondary === null) return display.primary || MISSING_PERFORMER_LABEL;
  return `${display.primary}, ${performerName ?? MISSING_PERFORMER_LABEL}`;
}

/** Same-venue cluster row. Keeps "Performer — Title" when the two differ. */
export function gigClusterItemLabel(
  title: string | null | undefined,
  performerName: string | null | undefined,
): string {
  const display = gigDisplayTitle(title, performerName);
  if (display.secondary === null) return display.primary || MISSING_PERFORMER_LABEL;
  return `${performerName ?? MISSING_PERFORMER_LABEL} — ${display.primary}`;
}
