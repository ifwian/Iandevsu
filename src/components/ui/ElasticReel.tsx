"use client";

import { cn } from "@/lib/cn";
import "./ElasticReel.css";

export interface ElasticReelItem {
  /** Image URL shown in the slice. */
  image: string;
  /** The subject's name, shown as the slice's label. */
  alt: string;
}

interface ElasticReelProps {
  items: ElasticReelItem[];
  className?: string;
}

/**
 * ElasticReel -- a dock of photo slices that swell open into full images.
 *
 * A row of equal vertical crops, one per subject. Hovering (or tapping, on a
 * device that reports hover) swells that slice open with an elastic overshoot
 * while its neighbours give up the room. Every slice opens to the same
 * frame -- the 3:4 shape, `340px * 3 / 4` (about 255px) wide -- so the
 * pictures all read at one size: the 3:4 files fill it edge to edge, and the
 * taller files sit centred inside it, `cover` trimming a little from their
 * top and bottom rather than being shown whole at a width no two photos
 * would share.
 *
 * The whole expansion is the CSS transition on the slice's flex properties --
 * no JS state, no rAF loop, no dependency beyond the stylesheet. A pointer
 * has one position, so exactly one slice is ever open; the layout itself
 * enforces the "dock" behaviour.
 *
 * The six images come from `LifeOutsideIDE`'s `GALLERY_ITEMS`, so the section
 * shows one set of photos.
 *
 * Accessibility: each slice is an `<img>` with the subject as its real alt
 * text. The visible label repeats that name for sighted readers and is
 * `aria-hidden`, so a screen reader hears each subject once. The swell is
 * decoration on top of an already-complete reading -- nothing is gated behind
 * the hover -- which is why the slices are not focusable controls.
 */
export default function ElasticReel({ items, className }: ElasticReelProps) {
  return (
    <div className={cn("elastic-reel", className)}>
      {items.map((item) => (
        <div key={item.alt} className="elastic-reel-slice">
          <img
            className="elastic-reel-image"
            src={item.image}
            alt={item.alt}
            loading="lazy"
            decoding="async"
          />
          <span className="elastic-reel-label" aria-hidden="true">
            {item.alt}
          </span>
        </div>
      ))}
    </div>
  );
}
