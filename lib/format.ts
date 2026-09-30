import type { Category } from "@/lib/types";

export {
  formatGigDay,
  formatGigWhen,
  gigMatchesVenueDate,
  isUpcoming,
  localDateKey,
  resolveTimeZone,
  toVenueDateTimeLocal,
  VENUE_TIME_ZONE,
  venueZoneLabel,
  venueZoneLongName,
} from "@/lib/venue-time";

/** Alias of VENUE_TIME_ZONE. The value is America/New_York, the launch default. */
export { VENUE_TIME_ZONE as AUSTIN_TZ } from "@/lib/venue-time";

export function categoryLabel(category: Category) {
  if (category === "dj") return "DJ";
  return category[0].toUpperCase() + category.slice(1);
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
