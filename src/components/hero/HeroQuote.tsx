import { HERO } from "@/content/hero";

/**
 * The quote under the pitch.
 *
 * A real `<blockquote>`: the reflective half of the copy, set apart with the
 * same 2px `--gray-300` edge it has carried since the column was split into a
 * lead and a quote. 14px, one step below the pitch, same sans and grey -- the
 * border is the one piece of chrome that says "set apart" without a second
 * heading saying it.
 */
export default function HeroQuote() {
  return <blockquote className="hero-quote">{HERO.quote}</blockquote>;
}
