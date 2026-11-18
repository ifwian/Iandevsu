import PixelTransition from "@/components/ui/PixelTransition";

/**
 * The portrait column: the photograph, with the hint as a caption under it.
 *
 * The hint used to sit ABOVE the photograph with a chevron pointing down at
 * it -- two pieces of furniture stacked on the picture that is itself the
 * control being described. Under it, at 13px in `--gray-500`, it reads as
 * what it is: a caption saying how the picture behaves on this device, at the
 * card's own type floor rather than at the 10px tracked whisper it carried.
 *
 * The hint is written twice and CSS picks between the two: pointer devices
 * read "Hover or tap the portrait", touch devices "Tap the portrait". "Hover"
 * on a phone describes an input that does not exist, and one generic sentence
 * ("interact with the portrait") would say nothing on either. The swap is a
 * `(hover: none)` media query in hero.css, so it costs no JavaScript and the
 * right sentence is on screen before React has mounted.
 *
 * The two images: the first is the portrait and is loaded eagerly -- it is
 * above the fold, and it is what the hero is looking at. The second only ever
 * appears after a hover or a tap, so it loads lazily; its `alt` is empty and
 * it is `aria-hidden` because the reveal is a visual flourish on one portrait,
 * not a second piece of content -- a screen reader should hear the portrait
 * once.
 *
 * Width and alignment are hero.css's (`.hero-portrait-col`): a fixed 240px
 * beside the content from 720px up, a 200px maximum stacked above it below.
 */
export default function HeroPortrait() {
  return (
    <div className="hero-portrait-col">
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

      <p className="hero-portrait-caption">
        <span className="hero-portrait-caption-hover">Hover or tap the portrait</span>
        <span className="hero-portrait-caption-touch">Tap the portrait</span>
      </p>
    </div>
  );
}
