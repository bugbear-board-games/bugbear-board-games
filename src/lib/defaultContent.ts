// Default text for the admin-editable parts of the site. Used by prisma/seed.ts to fill
// the database, and as a fallback when a block hasn't been saved yet. No imports here,
// so the seed script can load it directly.
export const DEFAULT_CONTENT = {
  tagline: "Pittsburgh's friendly neighborhood board game community.",
  mission:
    "Bugbear Board Games brings Pittsburghers together around the table. We host welcoming game nights for everyone, from first-timers to seasoned strategists, and work to build a community where new friendships are just one dice roll away.",
  guidelines: [
    "No bigotry of any sort, including casual misogyny/misandry. As we grow this community, we want everyone to feel welcome, accepted, and safe. Blatant violation of this guideline will result in an auto-ban.",
    "Be a good sport! It's okay to play to win, but no one likes a sore winner/loser.",
    "Don't be a jerk! This includes yucking yums, belittling, being impatient, and whatever other wonderful ways you can think to do this.",
    "We're playing at a bar! Don't bring your hyper premium fancy edition of Twilight Imperium if you're gonna be upset when the beers spill.",
    "Take care of the space! Don't leave a mess, and be sure to tip the bar staff. They like us, let's keep it that way.",
  ].join("\n\n"),
};
