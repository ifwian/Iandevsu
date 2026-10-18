import { HERO } from "@/content/hero";

/**
 * The name and the strapline under it.
 *
 * The name takes the display role (Geist Pixel), like every other heading on
 * the site. Sentence case, as written -- unlike .section-eyebrow, an h1 has no
 * text-transform, so the casing here is literally the casing that renders.
 */
export default function HeroIntro() {
  return (
    <>
      <h1 className="hero-name">Marianne Napaño</h1>
      <p className="hero-subtitle">{HERO.role}</p>
    </>
  );
}
