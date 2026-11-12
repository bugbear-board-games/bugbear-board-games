import { describe, expect, it } from "vitest";
import { DEFAULT_GUIDELINES, splitLegacyGuidelines } from "@/lib/defaultContent";
import { addressLines, mapsUrl, parseLocation } from "@/lib/location";
import { isPlatform, normalizeUrl, platformLabel } from "@/lib/social";
import { formatTime, parseLocalDateTime, toLocalInputValue } from "@/lib/time";

const form = (fields: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
};

describe("social links", () => {
  it("adds https:// to bare domains", () => {
    expect(normalizeUrl("instagram.com/bugbear")).toBe("https://instagram.com/bugbear");
  });
  it("keeps valid http(s) links", () => {
    expect(normalizeUrl("https://discord.gg/abc")).toBe("https://discord.gg/abc");
  });
  it.each(["javascript:alert(1)", "data:text/html,hi", "ftp://example.com", "", "   "])("rejects %j", (raw) => {
    expect(normalizeUrl(raw)).toBeNull();
  });
  it("knows its platforms", () => {
    expect(isPlatform("instagram")).toBe(true);
    expect(isPlatform("myspace")).toBe(false);
    expect(platformLabel("bgg")).toBe("BoardGameGeek");
  });
});

describe("guidelines conversion", () => {
  it("splits old single-text guidelines into title + body per paragraph", () => {
    const text = "Be a good sport! Play to win, nicely.\n\nDon't be a jerk!\nNo yucking yums.\n\nNo title punctuation here";
    expect(splitLegacyGuidelines(text)).toEqual([
      { title: "Be a good sport!", body: "Play to win, nicely." },
      { title: "Don't be a jerk!", body: "No yucking yums." },
      { title: "No title punctuation here", body: "" },
    ]);
  });
  it("has five default rules", () => {
    expect(DEFAULT_GUIDELINES).toHaveLength(5);
  });
});

describe("event location", () => {
  const good = { locationName: "Novo", address1: "1931 Smallman St", address2: "", city: "Pittsburgh", state: "pa", zip: "15222" };
  it("accepts a full address and uppercases the state", () => {
    const r = parseLocation(form(good));
    expect("data" in r && r.data).toEqual({ ...good, address2: null, state: "PA" });
  });
  it.each([
    [{ locationName: "" }, "location name"],
    [{ address1: "" }, "street address"],
    [{ state: "Penn" }, "two-letter"],
    [{ zip: "152" }, "ZIP"],
  ])("rejects %j", (override, message) => {
    const r = parseLocation(form({ ...good, ...override }));
    expect("error" in r && r.error).toContain(message);
  });
  it("formats lines and a maps link", () => {
    const loc = { ...good, address2: "Back room", state: "PA" };
    expect(addressLines(loc)).toEqual(["1931 Smallman St", "Back room", "Pittsburgh, PA 15222"]);
    expect(mapsUrl(loc)).toContain("https://www.google.com/maps/search/?api=1&query=Novo");
  });
});

describe("Pittsburgh time", () => {
  it("parses local times correctly in winter (EST) and summer (EDT)", () => {
    expect(parseLocalDateTime("2026-12-05T19:00")!.toISOString()).toBe("2026-12-06T00:00:00.000Z");
    expect(parseLocalDateTime("2027-06-05T19:00")!.toISOString()).toBe("2027-06-05T23:00:00.000Z");
  });
  it("round-trips through the form value", () => {
    const d = parseLocalDateTime("2026-11-18T18:30")!;
    expect(toLocalInputValue(d)).toBe("2026-11-18T18:30");
    expect(formatTime(d)).toBe("6:30 PM");
  });
  it("rejects malformed input", () => {
    expect(parseLocalDateTime("tomorrow at 7")).toBeNull();
  });
});
