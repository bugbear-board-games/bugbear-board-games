import { db } from "./db";
import { DEFAULT_CONTENT } from "./defaultContent";

// Text blocks admins can edit from the Admin page. Add new entries here
// (plus a default in prisma/seed.ts) to make more of the site editable.
export const EDITABLE_CONTENT = [
  { key: "tagline", label: "Tagline", multiline: false, hint: "" },
  { key: "mission", label: "Home page blurb", multiline: true, hint: "Leave a blank line between paragraphs." },
  { key: "guidelines", label: "Community guidelines", multiline: true, hint: "One guideline per paragraph, with a blank line between them. The first sentence of each becomes its heading." },
] as const;

export type ContentKey = (typeof EDITABLE_CONTENT)[number]["key"];

export async function getSiteContent(): Promise<Record<ContentKey, string>> {
  const rows = await db.siteContent.findMany();
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return Object.fromEntries(
    EDITABLE_CONTENT.map(({ key }) => [key, map[key] ?? DEFAULT_CONTENT[key]]),
  ) as Record<ContentKey, string>;
}
