"use client";

import DepthCarousel from "@/components/ui/DepthCarousel";

const INTERESTS = ["Photography", "Reading", "Gaming", "Hiking", "Music", "Nature"];

/**
 * The carousel's items, in the shape `DepthCarousel` expects: `image` plus
 * `alt`, which is the card's accessible name.
 *
 * Same six subjects as `INTERESTS` and in the same order, so the carousel
 * cycles through exactly what the pills beside it list.
 *
 * Module scope on purpose, not a `.map()` inside JSX. The array is in the
 * component's effect dependency list, and a new array every render would tear
 * down and rebuild the carousel each time.
 */
const GALLERY_ITEMS = [
  { image: "/images/photography-600w.webp", alt: "Photography" },
  { image: "/images/reading-600w.webp", alt: "Reading" },
  { image: "/images/gaming-600w.webp", alt: "Gaming" },
  { image: "/images/hiking-600w.webp", alt: "Hiking" },
  { image: "/images/music-600w.webp", alt: "Music" },
  { image: "/images/nature1-600w.webp", alt: "Nature" },
];

export default function LifeOutsideIDE() {

  return (
    <section 
      id="life" 
      className="section-frame px-5 py-16 lg:px-6"
      style={{ fontFamily: "var(--font-mono)" }}
    >
      <div className="w-full max-w-4xl mx-auto">
        <div className="section-shell">
          {/**
           * This section's eyebrow used to live inside the left grid column,
           * below the shell's top edge, which put it at a different vertical
           * position from every other section's. It is now in the title bar like
           * the rest, so the grid below starts with the heading.
           */}
          <div className="section-shell-bar">
            <p className="section-eyebrow">06 &mdash; life</p>
          </div>


          <div className="section-shell-body">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 lg:gap-16 items-center">
          
          {/* Left Column: Text & Interests */}
          <div className="lg:col-span-7 flex flex-col justify-center">
            {/* Main Title */}
            <h2 className="section-title">
              Outside the IDE
            </h2>

            {/* Description -- paragraph prose, so the body's sans. The max-w
                keeps the measure readable instead of letting it run the full
                width of the column. */}
            <p
              className="mb-6 max-w-xl text-[15px] leading-[1.75] text-[var(--gray-400)] sm:text-[17px]"
              style={{ fontFamily: "var(--font-body)" }}
            >
              When I step away from the tech world, I recharge through physical activity and creative hobbies, returning to my projects with fresh energy and perspective.
            </p>

            {/* Interest pills.

                Bare `.pill`, with nothing layered on top. This call site used to
                override the class on five separate axes at once, and two of them
                were doing visible damage:

                  - `px-3.5 py-1.5` overrode the class's `2px 8px`, making each
                    pill ~12px wider. That is what pushed the set past the column
                    and left NATURE hanging alone on its own line. On `.pill`'s own
                    padding the six total ~429px against a ~467px column, so they
                    sit on one row at lg and break 3+3 on a phone -- no orphan.
                  - `hover:border-gray-300 hover:bg-gray-100` set exactly the
                    colours the pill already had, so the hover did nothing at all.

                It also carried an inline `fontFamily: var(--font-display)`, which
                beat the class's `var(--font-mono)` and rendered these six in a
                different face from every other pill on the site.

                `items-center` so the pills share a cross-axis baseline, and no
                `pt-1`: the description's `mb-6` already sets the gap, and the
                nudge only made the group's alignment to the prose look arbitrary
                rather than shared. */}
            <div className="flex flex-wrap items-center gap-2">
              {INTERESTS.map((interest) => (
                <span key={interest} className="pill">
                  {interest}
                </span>
              ))}
            </div>
          </div>

          {/**
           * Right column: the depth carousel.
           *
           * No `overflow: hidden` on either box, deliberately. Clipping belongs
           * to the carousel's own stage, which is a *different* element from the
           * one carrying `transform-style: preserve-3d` -- an element with
           * `overflow` other than `visible` is rendered as if its
           * `transform-style` were `flat`, so putting both on one box silently
           * cancels the depth. See `DepthCarousel.css` for the full reasoning.
           *
           * `position: relative` and an explicit height on the inner box: the
           * carousel is `height: 100%`, and a percentage height against an
           * auto-height parent resolves to zero, which is what collapses the
           * whole fan into a strip.
           */}
          <div className="lg:col-span-5 flex items-center justify-center">
            <div
              className="relative w-full max-w-[380px] rounded-xl border border-[var(--gray-200)]"
              style={{ backgroundColor: "var(--gray-50)" }}
            >
              <div className="relative h-[300px] sm:h-[380px] lg:h-[450px]">
                <DepthCarousel
                  items={GALLERY_ITEMS}
                  cardWidth={260}
                  cardHeight={340}
                  depth={180}
                  spread={70}
                  tilt={18}
                  perspective={1200}
                  visibleCards={3}
                  radius={12}
                  tint="#05060a"
                  autoplay
                  loop
                />
              </div>
            </div>
          </div>

        </div>
          </div>
        </div>
      </div>
    </section>
  );
}
