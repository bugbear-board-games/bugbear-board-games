// Social platforms Admins can link from the home page. Add a platform here to offer it.
export const SOCIAL_PLATFORMS = [
  { key: "instagram", label: "Instagram" },
  { key: "facebook", label: "Facebook" },
  { key: "discord", label: "Discord" },
  { key: "meetup", label: "Meetup" },
  { key: "tiktok", label: "TikTok" },
  { key: "youtube", label: "YouTube" },
  { key: "x", label: "X (Twitter)" },
  { key: "bluesky", label: "Bluesky" },
  { key: "reddit", label: "Reddit" },
  { key: "bgg", label: "BoardGameGeek" },
  { key: "other", label: "Other link" },
] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number]["key"];

export function platformLabel(key: string): string {
  return SOCIAL_PLATFORMS.find((p) => p.key === key)?.label ?? "Link";
}

export function isPlatform(key: string): key is SocialPlatform {
  return SOCIAL_PLATFORMS.some((p) => p.key === key);
}

/** Accepts only http(s) links, so nothing like `javascript:` can end up on the page. */
export function normalizeUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  try {
    const url = new URL(/^[a-z]+:\/\//i.test(value) ? value : `https://${value}`);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}
