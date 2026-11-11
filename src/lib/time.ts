// All event times are entered and shown in Pittsburgh time, regardless of
// where the server runs or where a visitor is browsing from.
export const TIME_ZONE = "America/New_York";

function zoneOffsetMs(date: Date): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: TIME_ZONE,
      hourCycle: "h23",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    }).formatToParts(date).map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** Parse a `datetime-local` value ("2026-11-20T19:00") as Pittsburgh time. */
export function parseLocalDateTime(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  let result = guess - zoneOffsetMs(new Date(guess));
  // Re-check once in case the guess landed on the other side of a DST change.
  result = guess - zoneOffsetMs(new Date(result));
  return new Date(result);
}

/** Format a Date for a `datetime-local` input, in Pittsburgh time. */
export function toLocalInputValue(date: Date | null | undefined): string {
  if (!date) return "";
  const local = new Date(date.getTime() + zoneOffsetMs(date));
  return local.toISOString().slice(0, 16);
}

export function formatEventDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE, weekday: "long", month: "long", day: "numeric", year: "numeric",
  }).format(date);
}

export function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, hour: "numeric", minute: "2-digit" }).format(date);
}

export function formatShort(date: Date): { month: string; day: string } {
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, ...o }).format(date);
  return { month: f({ month: "short" }).toUpperCase(), day: f({ day: "numeric" }) };
}
