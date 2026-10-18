/**
 * The hero section's copy, in one place: the strapline under the name, the
 * pitch under it, the two metadata "files" rendered as a small tree, and the
 * GitHub figures the stat strip cannot derive.
 *
 * The blocks are data rather than markup, because the branch connectors are
 * decided by position -- the last row of a block gets `└──` and the rest `├──`
 * -- and hand-writing that per row is how the two end up disagreeing about
 * which line is the last one.
 *
 * File names are written lowercase; `.hero-tree-file` and `.hero-tree-key` both
 * uppercase, so `builds.sys` renders as `BUILDS.SYS` and a key like `focus` as
 * `FOCUS` from one casing decision in the stylesheet rather than two in the
 * markup.
 *
 * Kept in this file rather than in `content/profile.ts` on purpose: that file
 * is what the chat persona is fed, and these are captions for the hero, not
 * facts about her. Changing what the assistant knows is a separate decision
 * from changing what the hero says.
 *
 * There is deliberately no role row and no location row, and no `mission.log`
 * block either. The role is already in the strapline under her name; the
 * location is already in the sidebar; and what she is currently working on is
 * the one thing the stat strip's "Building" cell already says. What survives is
 * the line of copy none of those state: what she makes, and then the quote.
 *
 * `builds.sys` is numbered rather than keyed because it is a list of three, not
 * a set of fields -- `01`/`02`/`03` also match the numbered nav in the sidebar,
 * so the two read as the same numbering.
 *
 * `quote.txt` is the other shape: one line of prose with no key beside it, which
 * is a different thing from a field with a value. Modelled as a union so the two
 * cannot be confused -- a `quote` block has no `rows` and a `rows` block has no
 * `quote`, and adding a row to one of them is a compile error rather than a
 * block that renders half as a tree and half as a sentence.
 */

export type HeroBlock =
  | { file: string; rows: { key: string; value: string }[] }
  | { file: string; quote: string };

export interface HeroContent {
  /** The strapline under the name, sentence case, middot-separated. */
  role: string;
  /** The pitch under the strapline: the hero's one plain-prose sentence. */
  pitch: string;
  /** The metadata "files" rendered under it, in display order. */
  blocks: HeroBlock[];
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
    "I'm a computer science student building websites and little programs, and learning to turn ideas into working web apps.",
  blocks: [
    {
      file: "builds.sys",
      rows: [
        { key: "01", value: "websites" },
        { key: "02", value: "little programs" },
        { key: "03", value: "things I probably didn't need to make" },
      ],
    },
    { file: "quote.txt", quote: "Too curious to stick to one thing." },
  ],
  github: {
    repos: "12 Public",
    commits: "105+",
  },
};
