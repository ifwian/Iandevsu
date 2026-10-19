import { HERO } from "@/content/hero";

/**
 * The role eyebrow, the name, the pitch.
 *
 * The role line used to sit BELOW the name as a strapline, and its words were
 * said a second time in the pitch's first sentence ("Computer science student
 * ... / I'm a computer science student ..."), which stuttered before the
 * visitor had read anything else. Above the name it is what it always was: a
 * label, said once, ahead of the two sentences that are actually about the
 * work.
 *
 * The name takes the display role (Geist Pixel), like every other heading on
 * the site. Sentence case, as written -- unlike .section-eyebrow, an h1 has no
 * text-transform, so the casing here is literally the casing that renders.
 *
 * The three elements carry no spacing utilities of their own: the rhythm
 * between them (8px, then 16px) is part of the card's shared scale in
 * hero.css, so the intro cannot drift away from the blocks below it.
 */
export default function HeroIntro() {
  return (
    <>
      <p className="hero-role">{HERO.role}</p>
      <h1 className="hero-name">Marianne Napaño</h1>
      <p className="hero-pitch">{HERO.pitch}</p>
    </>
  );
}
