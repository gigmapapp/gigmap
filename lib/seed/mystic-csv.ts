import { slugify } from "@/lib/slug";
import type { Category } from "@/lib/types";
import { parseVenueDateTimeLocal } from "@/lib/venue-instant";
import { lookupVenueTimeZone } from "@/lib/venue-zone";

/**
 * Turn the Mystic public-listing CSV into seed-shaped performers and gigs.
 *
 * `start_time_et` is the venue wall clock. The header says ET because the
 * sheet is Connecticut and Rhode Island. The zone stored on the gig is still
 * looked up from lat/lng.
 *
 * `bio` is copied as-is onto the performer. `notes` is editorial and is not
 * stored: it must not show up as a gig description or anywhere else public.
 */

const COLUMNS = [
  "performer_name",
  "category",
  "bio",
  "venue_name",
  "street_address",
  "lat",
  "lng",
  "date",
  "start_time_et",
  "source_url",
  "notes",
] as const;

type Column = (typeof COLUMNS)[number];

export type PublicListingPerformer = {
  id: string;
  name: string;
  category: Category;
  bio: string;
  city: string;
  genres: string[];
  videos: [];
};

export type PublicListingGig = {
  id: string;
  performerId: string;
  title: string;
  /** Always empty. CSV notes are not public. */
  description: "";
  category: Category;
  /** UTC instant of `start_time_et` interpreted in the lat/lng zone. */
  datetime: string;
  timezone: string;
  location: { lat: number; lng: number; label: string };
  sourceUrl: string;
  sourceKind: "public_info";
};

export type PublicListingSeed = {
  performers: PublicListingPerformer[];
  gigs: PublicListingGig[];
};

export function publicListingsFromCsv(csv: string): PublicListingSeed {
  const table = parseCsv(csv);
  if (table.length === 0) throw new Error("CSV is empty.");
  const header = table[0]!;
  if (header.join(",") !== COLUMNS.join(",")) {
    throw new Error(`CSV columns must be ${COLUMNS.join(", ")}.`);
  }

  const performers = new Map<string, PublicListingPerformer>();
  const gigs: PublicListingGig[] = [];
  const gigIds = new Set<string>();

  for (const cells of table.slice(1)) {
    const record = Object.fromEntries(COLUMNS.map((column, index) => [column, cells[index]?.trim() ?? ""])) as Record<
      Column,
      string
    >;
    const name = required(record.performer_name, "performer_name");
    const category = categoryFromCsv(record.category);
    const bio = record.bio;
    const venueName = required(record.venue_name, "venue_name");
    const street = required(record.street_address, "street_address");
    const city = cityFromAddress(street);
    const lat = coordinate(record.lat, "lat", -90, 90);
    const lng = coordinate(record.lng, "lng", -180, 180);
    const date = required(record.date, "date");
    const start = required(record.start_time_et, "start_time_et");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`Invalid date "${date}" for ${name}.`);
    if (!/^\d{2}:\d{2}$/.test(start)) throw new Error(`Invalid start time "${start}" for ${name}.`);
    const sourceUrl = required(record.source_url, "source_url");
    if (!/^https:\/\/\S+$/.test(sourceUrl)) {
      throw new Error(`source_url must be an https URL for ${name}.`);
    }
    // Editorial notes stay off the public row. Do not assign them to description.
    void record.notes;

    const performerId = slugify(name);
    if (!performerId) throw new Error(`Could not build an id for ${name}.`);
    const existing = performers.get(performerId);
    if (!existing) {
      performers.set(performerId, {
        id: performerId,
        name,
        category,
        bio,
        city,
        genres: [],
        videos: [],
      });
    } else if (existing.name !== name || existing.category !== category || existing.bio !== bio || existing.city !== city) {
      throw new Error(`Performer ${performerId} appears twice with different details.`);
    }

    const gigId = `${performerId}-${date}`;
    if (gigId.length > 80) throw new Error(`Gig id is too long: ${gigId}`);
    if (gigIds.has(gigId)) throw new Error(`Duplicate gig id ${gigId}.`);
    gigIds.add(gigId);

    const timezone = lookupVenueTimeZone(lat, lng);
    gigs.push({
      id: gigId,
      performerId,
      title: name,
      description: "",
      category,
      datetime: parseVenueDateTimeLocal(`${date}T${start}`, timezone),
      timezone,
      location: { lat, lng, label: `${venueName}, ${street}` },
      sourceUrl,
      sourceKind: "public_info",
    });
  }

  return { performers: [...performers.values()], gigs };
}

function required(value: string, label: string): string {
  if (!value) throw new Error(`${label} is required.`);
  return value;
}

function categoryFromCsv(value: string): Category {
  const key = value.trim().toLowerCase();
  if (key === "band" || key === "dj" || key === "solo") return key;
  throw new Error(`Unknown category "${value}". Expected Band, DJ, or Solo.`);
}

function coordinate(value: string, label: string, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new Error(`Invalid ${label}: ${value}`);
  }
  return parsed;
}

function cityFromAddress(address: string): string {
  const parts = address.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length < 3) throw new Error(`Street address needs street, city, and state: ${address}`);
  const city = parts[parts.length - 2]!;
  const state = parts[parts.length - 1]!.split(/\s+/)[0] ?? "";
  if (!/^[A-Z]{2}$/.test(state)) throw new Error(`Could not read a state from: ${address}`);
  return `${city}, ${state}`;
}

/** RFC 4180-ish reader for the listing sheet: quotes, commas, and CRLF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const src = text.replace(/^\uFEFF/, "");

  for (let i = 0; i < src.length; i += 1) {
    const char = src[i]!;
    if (inQuotes) {
      if (char === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      continue;
    }
    if (char === ",") {
      row.push(field);
      field = "";
      continue;
    }
    if (char === "\n" || char === "\r") {
      if (char === "\r" && src[i + 1] === "\n") i += 1;
      row.push(field);
      field = "";
      if (row.some((cell) => cell.length > 0)) rows.push(row);
      row = [];
      continue;
    }
    field += char;
  }

  if (inQuotes) throw new Error("CSV has an unterminated quote.");
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((cell) => cell.length > 0)) rows.push(row);
  }
  return rows;
}
