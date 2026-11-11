// Repeat rules for event series. Pure calendar math on Pittsburgh-local dates written
// as "YYYY-MM-DD" strings, so there are no time-zone or daylight-saving surprises here;
// times are attached later with parseLocalDateTime.

export type Frequency = "WEEKLY" | "MONTHLY";

export type RepeatRule = {
  frequency: Frequency;
  /** WEEKLY only: every N weeks (1 = every week, 2 = every other week). */
  interval: number;
  /** 0 = Sunday … 6 = Saturday. */
  weekday: number;
  /** MONTHLY only: which occurrences of the weekday, 1–4, or -1 for the last one. */
  weeksOfMonth: number[];
  /** First date the schedule can fall on. */
  startDate: string;
  /** Last date the schedule can fall on, or null to repeat indefinitely. */
  endDate: string | null;
};

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const WEEK_OPTIONS = [
  { value: 1, label: "First" },
  { value: 2, label: "Second" },
  { value: 3, label: "Third" },
  { value: 4, label: "Fourth" },
  { value: -1, label: "Last" },
];

const DAY_MS = 86_400_000;
const toMs = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));
const fromMs = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export const isDateString = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && fromMs(toMs(s)) === s;
export const addDays = (d: string, n: number) => fromMs(toMs(d) + n * DAY_MS);
export const weekdayOf = (d: string) => new Date(toMs(d)).getUTCDay();
const maxDate = (a: string, b: string) => (a > b ? a : b);

/** Day of the month of the nth `weekday` (n = -1 for the last), or null if that month has none. */
function nthWeekday(year: number, month0: number, weekday: number, n: number): number | null {
  const daysInMonth = new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
  if (n === -1) {
    const lastDow = new Date(Date.UTC(year, month0, daysInMonth)).getUTCDay();
    return daysInMonth - ((lastDow - weekday + 7) % 7);
  }
  const firstDow = new Date(Date.UTC(year, month0, 1)).getUTCDay();
  const day = 1 + ((weekday - firstDow + 7) % 7) + 7 * (n - 1);
  return day <= daysInMonth ? day : null;
}

/** The first date on or after the start date that falls on the rule's weekday. */
function weeklyAnchor(rule: RepeatRule): string {
  return addDays(rule.startDate, (rule.weekday - weekdayOf(rule.startDate) + 7) % 7);
}

/** Does `date` fall on this schedule? */
export function matches(rule: RepeatRule, date: string): boolean {
  if (date < rule.startDate || (rule.endDate && date > rule.endDate)) return false;
  if (weekdayOf(date) !== rule.weekday) return false;
  if (rule.frequency === "WEEKLY") {
    const weeks = Math.round((toMs(date) - toMs(weeklyAnchor(rule))) / (7 * DAY_MS));
    return weeks >= 0 && weeks % rule.interval === 0;
  }
  const y = +date.slice(0, 4), m = +date.slice(5, 7) - 1, d = +date.slice(8, 10);
  return rule.weeksOfMonth.some((n) => nthWeekday(y, m, rule.weekday, n) === d);
}

/** Every date on the schedule from `from` to `to`, inclusive, in order. */
export function occurrences(rule: RepeatRule, from: string, to: string): string[] {
  const out: string[] = [];
  const end = rule.endDate && rule.endDate < to ? rule.endDate : to;
  let d = maxDate(from, rule.startDate);
  // Step to the right weekday, then a week at a time; matches() handles the rest.
  d = addDays(d, (rule.weekday - weekdayOf(d) + 7) % 7);
  for (; d <= end; d = addDays(d, 7)) if (matches(rule, d)) out.push(d);
  return out;
}

function joinWords(words: string[]): string {
  if (words.length <= 2) return words.join(" and ");
  return `${words.slice(0, -1).join(", ")}, and ${words[words.length - 1]}`;
}

/** Plain-English summary, e.g. "Every first and third Wednesday". */
export function describe(rule: Pick<RepeatRule, "frequency" | "interval" | "weekday" | "weeksOfMonth">): string {
  const day = WEEKDAYS[rule.weekday];
  if (rule.frequency === "WEEKLY") {
    if (rule.interval === 1) return `Every ${day}`;
    if (rule.interval === 2) return `Every other ${day}`;
    return `Every ${rule.interval} weeks on ${day}`;
  }
  const order = [1, 2, 3, 4, -1];
  const words = [...rule.weeksOfMonth]
    .sort((a, b) => order.indexOf(a) - order.indexOf(b))
    .map((n) => WEEK_OPTIONS.find((o) => o.value === n)!.label.toLowerCase());
  return `Every ${joinWords(words)} ${day}`;
}
