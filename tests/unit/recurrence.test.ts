import { describe, expect, it } from "vitest";
import { describe as describeRule, matches, occurrences, type RepeatRule } from "@/lib/recurrence";

// Nov 2026 Wednesdays: 4, 11, 18, 25. Dec: 2, 9, 16, 23, 30. Jan 2027: 6, 13, 20, 27.
const base = { interval: 1, weeksOfMonth: [] as number[], endDate: null };
const firstAndThirdWed: RepeatRule = { ...base, frequency: "MONTHLY", weekday: 3, weeksOfMonth: [1, 3], startDate: "2026-11-01" };

describe("monthly on chosen weeks", () => {
  it("every first and third Wednesday", () => {
    expect(occurrences(firstAndThirdWed, "2026-11-01", "2027-01-31")).toEqual([
      "2026-11-04", "2026-11-18", "2026-12-02", "2026-12-16", "2027-01-06", "2027-01-20",
    ]);
  });

  it("last Friday of the month", () => {
    const rule: RepeatRule = { ...base, frequency: "MONTHLY", weekday: 5, weeksOfMonth: [-1], startDate: "2026-11-01" };
    expect(occurrences(rule, "2026-11-01", "2027-01-31")).toEqual(["2026-11-27", "2026-12-25", "2027-01-29"]);
  });

  it("fourth week exists even in February", () => {
    expect(occurrences({ ...firstAndThirdWed, weeksOfMonth: [4] }, "2027-02-01", "2027-02-28")).toEqual(["2027-02-24"]);
  });

  it("does not duplicate when fourth and last are the same day", () => {
    expect(occurrences({ ...firstAndThirdWed, weeksOfMonth: [4, -1] }, "2026-11-01", "2026-11-30")).toEqual(["2026-11-25"]);
  });

  it("matches only scheduled days", () => {
    expect(matches(firstAndThirdWed, "2026-11-18")).toBe(true);
    expect(matches(firstAndThirdWed, "2026-11-11")).toBe(false);
  });
});

describe("weekly", () => {
  it("starts on the first matching weekday on/after the start date", () => {
    const rule: RepeatRule = { ...base, frequency: "WEEKLY", weekday: 3, startDate: "2026-11-12" };
    expect(occurrences(rule, "2026-11-01", "2026-12-05")).toEqual(["2026-11-18", "2026-11-25", "2026-12-02"]);
  });

  it("every other week keeps its rhythm regardless of the window start", () => {
    const rule: RepeatRule = { ...base, frequency: "WEEKLY", interval: 2, weekday: 3, startDate: "2026-11-04" };
    expect(occurrences(rule, "2026-11-01", "2026-12-31")).toEqual(["2026-11-04", "2026-11-18", "2026-12-02", "2026-12-16", "2026-12-30"]);
    expect(occurrences(rule, "2026-11-10", "2026-11-30")).toEqual(["2026-11-18"]);
  });

  it("respects an end date", () => {
    expect(occurrences({ ...firstAndThirdWed, endDate: "2026-12-10" }, "2026-11-01", "2027-01-31")).toEqual([
      "2026-11-04", "2026-11-18", "2026-12-02",
    ]);
  });
});

describe("plain-English summaries", () => {
  it.each([
    [firstAndThirdWed, "Every first and third Wednesday"],
    [{ ...firstAndThirdWed, weeksOfMonth: [-1, 2, 1] }, "Every first, second, and last Wednesday"],
    [{ ...base, frequency: "MONTHLY", weekday: 5, weeksOfMonth: [-1], startDate: "2026-11-01" } as RepeatRule, "Every last Friday"],
    [{ ...base, frequency: "WEEKLY", weekday: 3, startDate: "2026-11-01" } as RepeatRule, "Every Wednesday"],
    [{ ...base, frequency: "WEEKLY", interval: 2, weekday: 3, startDate: "2026-11-01" } as RepeatRule, "Every other Wednesday"],
  ])("%#: %s", (rule, text) => {
    expect(describeRule(rule)).toBe(text);
  });
});
