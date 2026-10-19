"use client";

import ElasticReel from "@/components/ui/ElasticReel";

const INTERESTS = ["Photography", "Reading", "Gaming", "Hiking", "Music", "Nature"];

/**
 * The reel's items: `image` plus `alt`, which is the photo's accessible name.
 *
 * All six files are portrait. Photography, reading, gaming and music are
 * 600x1067; hiking and nature1 are 600x800 (3:4, the shape the reel opens
 * every slice to). The taller four sit centred in that 3:4 frame on hover,
 * trimmed a little at top and bottom -- for each of them the centre is where
 * the subject is.
 *
 * Same six subjects as `INTERESTS` and in the same order, so the reel at the
 * bottom of the section shows exactly what the pills above it list.
 *
 * Module scope on purpose, not a `.map()` inside JSX: one stable array for
 * the reel's only prop beats a fresh identity on every render.
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
    <section id="life" className="section-frame px-5 py-16 lg:px-6">
      <div className="w-full max-w-4xl mx-auto">
        <div className="section-shell">
          {/**
           * This section's eyebrow used to live inside the left grid column,
           * below the shell's top edge, which put it at a different vertical
           * position from every other section's. It is now in the title bar like
           * the rest, so the content starts with the heading.
           */}
          <div className="section-shell-bar">
            <p className="section-eyebrow">05 &mdash; life</p>
          </div>

          {/**
           * One column now: heading, description and pills lead, the picture
           * reel closes the section.
           *
           * The 3D depth carousel that used to sit beside the copy is gone. It
           * was a bounded box in a 5/12 column, and every version of it had to
           * spend its CSS on keeping a fan of tilted cards inside that box
           * without slicing their corners. The reel is the same six photos as
           * one dock across the full body width -- more picture, less machinery,
           * and it needs no clipping because nothing leaves its own slice.
           */}
          <div className="section-shell-body">
            {/* Main Title */}
            <h2 className="section-title">
              Outside the IDE
            </h2>

            {/* Description -- prose, so the body's sans -- via `.section-lede`,
                which is the one description register every section shares. */}
            <p className="section-lede">
              When I step away from the tech world, I recharge through physical activity and creative hobbies, returning to my projects with fresh energy and perspective.
            </p>

            {/* Interest pills.

                Bare `.pill`, with nothing layered on top. This call site used to
                override the class on five separate axes at once, and two of them
                were doing visible damage:

                  - `px-3.5 py-1.5` overrode the class's `2px 8px`, making each
                    pill ~12px wider. Against the old two-column grid that was
                    enough to push the set past its column and leave NATURE
                    hanging alone on its own line; at the body's full width the
                    six sit on one row with room to spare, and still break 3+3
                    on a phone -- no orphan.
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

            {/**
             * The reel closes the section: all six subjects as one dock, each
             * slice swelling open to the same 3:4 frame with its photo filling
             * it.
             *
             * The gap above it is the one spacing decision here. `.section-lede`
             * carries `margin-bottom: 2rem` for the gap under a description, but
             * the pills sit between that description and the reel -- so the reel
             * needs its own margin, and it is the pills' own 0.5rem row gap
             * scaled up to a section step rather than a value invented here.
             */}
            <ElasticReel items={GALLERY_ITEMS} className="mt-8 lg:mt-10" />
          </div>
        </div>
      </div>
    </section>
  );
}
