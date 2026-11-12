// Default text for the admin-editable parts of the site. Used by prisma/seed.ts to fill
// the database, and as a fallback when a block hasn't been saved yet. No imports here,
// so the seed script can load it directly.
export const DEFAULT_CONTENT = {
  tagline: "Pittsburgh's friendly neighborhood board game community.",
  mission:
    "Bugbear Board Games brings Pittsburghers together around the table. We host welcoming game nights for everyone, from first-timers to seasoned strategists, and work to build a community where new friendships are just one dice roll away.",
};

/** Starting community guidelines; seeded into the Guideline table when it's empty. */
export const DEFAULT_GUIDELINES: { title: string; body: string }[] = [
  {
    title: "No bigotry of any sort, including casual misogyny/misandry.",
    body: "As we grow this community, we want everyone to feel welcome, accepted, and safe. Blatant violation of this guideline will result in an auto-ban.",
  },
  { title: "Be a good sport!", body: "It's okay to play to win, but no one likes a sore winner/loser." },
  {
    title: "Don't be a jerk!",
    body: "This includes yucking yums, belittling, being impatient, and whatever other wonderful ways you can think to do this.",
  },
  {
    title: "We're playing at a bar!",
    body: "Don't bring your hyper premium fancy edition of Twilight Imperium if you're gonna be upset when the beers spill.",
  },
  {
    title: "Take care of the space!",
    body: "Don't leave a mess, and be sure to tip the bar staff. They like us, let's keep it that way.",
  },
];

/**
 * Converts the old single-text guidelines (one rule per paragraph, first sentence = title)
 * into separate rules. Used once by the seed to carry over any edits made before guidelines
 * had their own fields.
 */
export function splitLegacyGuidelines(text: string): { title: string; body: string }[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim().replace(/\s*\n\s*/g, " "))
    .filter(Boolean)
    .map((p) => {
      const m = p.match(/^(.+?[.!?])\s+(.+)$/);
      return m ? { title: m[1], body: m[2] } : { title: p, body: "" };
    });
}
