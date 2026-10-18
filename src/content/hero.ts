/**
 * The hero section's copy, in one place: the role eyebrow above the name, the
 * pitch under it, the line of things she makes, the quote under that, and the
 * GitHub figures the stat strip cannot derive.
 *
 * The role is stored as it renders -- sentence case, no `text-transform`
 * either way -- so the string in this file is literally the string on the
 * page.
 *
 * The three things she makes are a list rather than one joined string: the
 * " · " between them is typography, added at render time by HeroBuilds, so
 * reordering the list or adding a fourth item is a change here and nowhere
 * else.
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
  /** The pitch under the name: the hero's one sentence of plain prose. */
  pitch: string;
  /** The things she makes, in render order, joined with " · " on the page. */
  builds: string[];
  /** The pull quote under the builds line. */
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
    "I build websites and little programs, and I'm learning to turn ideas into working web apps.",
  builds: ["websites", "little programs", "things I probably didn't need to make"],
  quote: "Too curious to stick to one thing.",
  github: {
    repos: "12 Public",
    commits: "105+",
  },
};
