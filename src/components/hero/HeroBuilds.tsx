import { HERO } from "@/content/hero";

/**
 * What she makes, as one line, and the quote under it.
 *
 * These used to be two headed trees ("What I make" / "In my words") --
 * headings, numbered keys, drawn branch connectors -- built to carry one line
 * of three nouns and one sentence. Stated plainly they are the two lightest
 * pieces of copy in the column, and they now cost two lines instead of ten.
 *
 * The three items stay a list in hero.ts; the " · " is added here, at
 * rendering, because the separator is typography rather than content -- a
 * fourth item shows up as a fourth link in the chain with no other change.
 *
 * The quote is a real `<blockquote>`: it is borrowed words, and the element is
 * the honest way to say so. Its 2px `--gray-300` left border is the one piece
 * of chrome the block carries -- enough to tie the quote to the line above it
 * without giving it a second heading.
 */
export default function HeroBuilds() {
  return (
    <>
      <p className="hero-builds">{HERO.builds.join(" · ")}</p>
      <blockquote className="hero-quote">{HERO.quote}</blockquote>
    </>
  );
}
