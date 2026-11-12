import { db } from "./db";
import { DEFAULT_CONTENT } from "./defaultContent";

// Text blocks admins can edit from the Admin page. Add new entries here
// (plus a default in src/lib/defaultContent.ts) to make more of the site editable.
export const EDITABLE_CONTENT = [
  { key: "tagline", label: "Tagline", multiline: false, hint: "" },
  { key: "mission", label: "Home page blurb", multiline: true, hint: "Line breaks and spacing show on the home page exactly as typed here." },
] as const;

export type ContentKey = (typeof EDITABLE_CONTENT)[number]["key"];

export async function getSiteContent(): Promise<Record<ContentKey, string>> {
  const rows = await db.siteContent.findMany();
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return Object.fromEntries(
    EDITABLE_CONTENT.map(({ key }) => [key, map[key] ?? DEFAULT_CONTENT[key]]),
  ) as Record<ContentKey, string>;
}

/** Announcements currently showing on the home page (no end date, or ending in the future). */
export function activeAnnouncements() {
  return db.announcement.findMany({
    where: { OR: [{ showUntil: null }, { showUntil: { gt: new Date() } }] },
    orderBy: { createdAt: "desc" },
  });
}
