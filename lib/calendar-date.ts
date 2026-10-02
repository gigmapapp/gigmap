const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Format a date-only `YYYY-MM-DD` value as `Sun, Oct 18`.
 * The year is included only when it is not the UTC year of `now`, as in `Mon, Jan 4, 2027`.
 * Parts are read from the string and formatted in UTC, so the calendar day does not shift.
 * Invalid or empty input is returned unchanged.
 */
export function formatCalendarDate(value: string, now: Date = new Date()): string {
  const match = DATE_ONLY.exec(value);
  if (!match) return value;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = new Date(Date.UTC(year, month - 1, day));
  if (utc.getUTCFullYear() !== year || utc.getUTCMonth() !== month - 1 || utc.getUTCDate() !== day) {
    return value;
  }
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(year === now.getUTCFullYear() ? {} : { year: "numeric" as const }),
  }).format(utc);
}
