import { HERO } from "@/content/hero";

/**
 * The name, the role line under it, and the pitch under that.
 *
 * The name takes the display role (Geist Pixel), like every other heading on
 * the site. Sentence case, as written -- unlike .section-eyebrow, an h1 has no
 * text-transform, so the casing here is literally the casing that renders.
 *
 * The role line and the pitch answer "who is this" before the tree below
 * starts listing details: the role says what she is, the pitch says what she
 * is doing with it. Both are stored as they render -- see `.hero-subtitle`
 * and `.hero-pitch` in hero.css, neither of which transforms its text.
 */
export default function HeroIntro() {
  return (
    <>
      <h1 className="hero-name">Marianne Napaño</h1>
      <p className="hero-subtitle">{HERO.role}</p>
      <p className="hero-pitch">{HERO.pitch}</p>
    </>
  );
}
