import { ArrowDown } from "lucide-react";
import PixelTransition from "@/components/ui/PixelTransition";

/**
 * The portrait, with an indicator above it.
 *
 * The wrapper exists so the hint and the arrow are centred on the photograph
 * rather than on the column. It carries the responsive width and the portrait
 * fills it, which means there is one place that decides how wide the portrait
 * is -- if the hint were ever set wider than the photo, this wrapper would grow
 * with it and the arrow would stop pointing at the picture's middle.
 *
 * The hint is written twice and CSS picks between the two: pointer devices
 * read "Hover or tap the portrait", touch devices "Tap the portrait". "Hover"
 * on a phone describes an input that does not exist, and one generic sentence
 * ("interact with the portrait") would say nothing on either. The swap is a
 * `(hover: none)` media query in hero.css, so it costs no JavaScript and the
 * right sentence is on screen before React has mounted.
 *
 * `aria-hidden` on the arrow because the hint above it already says what it
 * points at; announcing a chevron adds nothing. The hint itself is real text
 * and is read.
 *
 * The two images: the first is the portrait and is loaded eagerly -- it is
 * above the fold, and it is what the hero is looking at. The second only ever
 * appears after a hover or a tap, so it loads lazily; its `alt` is empty and
 * it is `aria-hidden` because the reveal is a visual flourish on one portrait,
 * not a second piece of content -- a screen reader should hear the portrait
 * once.
 */
export default function HeroPortrait() {
  return (
    <div className="hero-portrait-wrap flex w-44 shrink-0 flex-col items-center sm:w-52 md:w-[180px] lg:w-[200px]">
      <p className="hero-portrait-hint">
        <span className="hero-portrait-hint-hover">Hover or tap the portrait</span>
        <span className="hero-portrait-hint-touch">Tap the portrait</span>
      </p>
      <ArrowDown
        size={14}
        strokeWidth={1.7}
        aria-hidden="true"
        className="hero-portrait-arrow"
      />
      <PixelTransition
        firstContent={
          <img
            src="/images/anime-480w.webp"
            alt="Illustrated black-and-white portrait"
            width={480}
            height={480}
            fetchPriority="high"
            className="block h-full w-full object-cover"
          />
        }
        secondContent={
          <img
            src="/images/ianface-480w.webp"
            alt=""
            aria-hidden="true"
            width={480}
            height={480}
            loading="lazy"
            decoding="async"
            className="block h-full w-full object-cover"
          />
        }
        gridSize={7}
        pixelColor="var(--bg)"
        animationStepDuration={0.3}
        className="hero-portrait aspect-[5/6] w-full overflow-hidden"
      />
    </div>
  );
}
