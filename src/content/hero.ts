/**
 * The hero section's copy, in one place: the role eyebrow above the name, the
 * pitch under it, the quote under that, and the GitHub figures the stat strip
 * cannot derive.
 *
 * The role and the two prose sentences are stored as they render -- sentence
 * case, no `text-transform` either way -- so the strings in this file are
 * literally the strings on the page.
 *
 * Kept in this file rather than in `content/profile.ts` on purpose: that file
 * is what the chat persona is fed, and these are captions for the hero, not
 * facts about her. Changing what the assistant knows is a separate decision
 * from changing what the hero says.
 *
 * There is deliberately no location row and no `mission.log` block: the
 * location is already in the sidebar, and what she is currently working on is
 * the one thing the stat strip's status cell already says.
 */

export interface HeroContent {
  /** The role line, an eyebrow above the name. Sentence case, middot-separated. */
  role: string;
  /** The pitch under the name: what she builds, as one sentence. */
  pitch: string;
  /** The pull quote under the pitch: the reflective half of the copy. */
  quote: string;
  /**
   * The stat strip's two GitHub figures.
   *
   * The strip's project counts are derived from `content/projects.ts`; these
   * two cannot be, because the site has no reusable GitHub feed (the activity
   * section fetches a contribution calendar, which carries neither). They are
   * maintained by hand: bump them when they drift. "105+" is deliberately a
   * floor, not a ledger.
   */
  github: {
    repos: string;
    commits: string;
  };
}

export const HERO: HeroContent = {
  role: "Computer science student · aspiring web developer",
  pitch:
    "I build websites, little programs, and the occasional web app I probably didn't need to make.",
  quote:
    "These days, I'm just exploring whatever catches my interest and turning rough ideas into real things—too curious to stick to just one thing.",
  github: {
    repos: "12 Public",
    commits: "105+",
  },
};
