import { db } from "./db";

// Text blocks admins can edit from the Admin page. Add new entries here
// (plus a default in prisma/seed.ts) to make more of the site editable.
export const EDITABLE_CONTENT = [
  { key: "tagline", label: "Tagline", multiline: false },
  { key: "mission", label: "Home page blurb", multiline: true },
] as const;

export type ContentKey = (typeof EDITABLE_CONTENT)[number]["key"];

export async function getSiteContent(): Promise<Record<ContentKey, string>> {
  const rows = await db.siteContent.findMany();
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return { tagline: map.tagline ?? "", mission: map.mission ?? "" };
}
