const AUSTIN = "America/Chicago";

type Civil = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function chicagoParts(instant: Date): Civil {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: AUSTIN,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? "0");
  let hour = read("hour");
  if (hour === 24) hour = 0;
  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour,
    minute: read("minute"),
    second: read("second"),
  };
}

/** Minutes east of UTC for the Chicago wall clock at this instant (CDT is -300). */
function chicagoOffsetMinutes(instant: Date): number {
  const parts = chicagoParts(instant);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return Math.round((asUtc - instant.getTime()) / 60000);
}

/**
 * A Chicago wall-clock time `daysFromToday` after `now`'s Chicago calendar date.
 * Returns an ISO string with the numeric offset, so the instant does not depend on the host timezone.
 */
export function austinDateTime(
  daysFromToday: number,
  hour: number,
  minute: number,
  now = new Date(),
): string {
  const today = chicagoParts(now);
  const wallAsUtc = new Date(Date.UTC(today.year, today.month - 1, today.day + daysFromToday, hour, minute, 0));
  let offset = chicagoOffsetMinutes(wallAsUtc);
  let instant = new Date(wallAsUtc.getTime() - offset * 60_000);
  const corrected = chicagoOffsetMinutes(instant);
  if (corrected !== offset) {
    offset = corrected;
    instant = new Date(wallAsUtc.getTime() - offset * 60_000);
  }
  const year = wallAsUtc.getUTCFullYear();
  const month = String(wallAsUtc.getUTCMonth() + 1).padStart(2, "0");
  const day = String(wallAsUtc.getUTCDate()).padStart(2, "0");
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  const sign = offset >= 0 ? "+" : "-";
  const abs = Math.abs(offset);
  const offsetHour = String(Math.floor(abs / 60)).padStart(2, "0");
  const offsetMinute = String(abs % 60).padStart(2, "0");
  const iso = `${year}-${month}-${day}T${hh}:${mm}:00${sign}${offsetHour}:${offsetMinute}`;
  if (Number.isNaN(new Date(iso).getTime())) {
    throw new Error(`Invalid Austin datetime: ${iso}`);
  }
  return iso;
}
