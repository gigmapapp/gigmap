import type { Category } from "@/lib/types";

export {
  formatGigDay,
  formatGigWhen,
  gigMatchesVenueDate,
  isUpcoming,
  localDateKey,
  toVenueDateTimeLocal,
  VENUE_TIME_ZONE,
} from "@/lib/venue-time";

/** @see VENUE_TIME_ZONE */
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
