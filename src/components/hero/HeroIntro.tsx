import { useEffect, useState } from "react";
import { HERO } from "@/content/hero";
import { TypingAnimation } from "@/components/ui/typing-animation";
import TechText from "@/components/ui/TechText";

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
 * The name is a TechText wordmark (React Bits): a canvas that draws the letters in
 * the heading's own font and colour, and reveals their outlines under the pointer.
 * The <h1> stays the heading; TechText is role="img" with the name as its label, so
 * assistive tech reads one "Marianne Napaño" and nothing about the canvas. Under
 * prefers-reduced-motion it renders still, solid letters (no intro, no sweep).
 *
 * The three elements carry no spacing utilities of their own: the rhythm
 * between them (8px, then 16px) is part of the card's shared scale in
 * hero.css, so the intro cannot drift away from the blocks below it.
 */
export default function HeroIntro() {
  /* The wordmark is a canvas, so its alignment is a prop, not CSS: centred in
     the stacked mobile layout, left-aligned beside the portrait from 720px. */
  const [stacked, setStacked] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 719.98px)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 719.98px)");
    const sync = () => setStacked(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return (
    <>
      <TypingAnimation
        as="p"
        className="hero-role leading-[inherit] tracking-[inherit]"
        duration={45}
        cursorStyle="underscore"
      >
        {HERO.role}
      </TypingAnimation>
      <h1 className="hero-name hero-name--wordmark">
        <TechText
          text="Marianne Napaño"
          align={stacked ? "center" : "left"}
          fontWeight={500}
          fontSize={120}
          letterSpacing={-0.04}
          reveal="letter"
          intro="type"
          introDuration={1.6}
          specks={12}
          labels={false}
          guides={false}
        />
      </h1>
      <p className="hero-pitch">{HERO.pitch}</p>
    </>
  );
}
