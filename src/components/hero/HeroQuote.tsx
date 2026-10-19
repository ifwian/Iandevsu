import { HERO } from "@/content/hero";

/**
 * The closing sentence under the pitch.
 *
 * A plain paragraph, formatted exactly like the pitch above it: the copy is
 * one voice now, so there is no border and no indent to set it apart. It
 * keeps its own element and its own string in `content/hero.ts` because the
 * two sentences are two thoughts -- the paragraph break is the only mark
 * they need.
 */
export default function HeroQuote() {
  return <p className="hero-quote">{HERO.quote}</p>;
}
