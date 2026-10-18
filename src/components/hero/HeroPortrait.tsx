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
 * The label is not decoration: `PixelTransition` binds
 * `onMouseEnter`/`onMouseLeave` on pointer devices and `onClick` on touch
 * devices, so hovering swaps the portrait and a tap toggles it. Both words are
 * true, which is the only reason to put them on the page.
 *
 * `aria-hidden` on the arrow because the label above it already says what it
 * points at; announcing a chevron adds nothing. The label itself is real text
 * and is read.
 */
export default function HeroPortrait() {
  return (
    <div className="hero-portrait-wrap flex w-44 shrink-0 flex-col items-center sm:w-52 md:w-[180px] lg:w-[200px]">
      <p className="hero-portrait-hint">hover me / click me !</p>
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
            alt="Photo of Marianne"
            width={480}
            height={480}
            fetchPriority="high"
            className="block h-full w-full object-cover"
          />
        }
        secondContent={
          <img
            src="/images/ianface-480w.webp"
            alt="Photo of Marianne Hover"
            width={480}
            height={480}
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
