import type { Category } from "@/lib/types";

export const AUSTIN_TZ = "America/Chicago";

export function formatGigWhen(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: AUSTIN_TZ,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatGigDay(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: AUSTIN_TZ,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(iso));
}

export function localDateKey(iso: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: AUSTIN_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

export function startOfLocalDay(date = new Date()) {
  const key = localDateKey(date.toISOString());
  return new Date(`${key}T00:00:00-05:00`);
}

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
