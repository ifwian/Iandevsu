import { ArrowDown } from "lucide-react";

/**
 * The hero's action row: one primary button.
 *
 * "View projects" is the single next step the hero asks for -- the column
 * above it states who she is and what she makes, and this is the one control
 * that acts on it. It is a plain `#projects` anchor, so it scrolls exactly
 * like every sidebar link does: `html` carries `scroll-behavior: smooth`, the
 * reduced-motion block resets that to `auto`, and `scroll-margin-top` keeps
 * the section clear of the mobile bar. No click handler, no second scrolling
 * mechanism to keep in sync with the first.
 *
 * The arrow points down because the destination is further down the page --
 * the up-right arrow is the site's external-link mark, and this link does not
 * leave the page.
 */
export default function HeroActions() {
  return (
    <div className="mt-8 flex w-fit max-w-full flex-wrap items-center justify-center gap-2 md:justify-start">
      <a href="#projects" className="hero-action-primary">
        <span>View projects</span>
        <ArrowDown
          size={14}
          strokeWidth={1.7}
          aria-hidden="true"
          className="hero-action-arrow"
        />
      </a>
    </div>
  );
}
