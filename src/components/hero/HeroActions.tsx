import { ArrowDown, ArrowUpRight } from "lucide-react";
import { SOCIAL_ITEMS } from "@/lib/socials";

/**
 * The hero's action row: the primary step, then the social links.
 *
 * "view projects" is the single next step the column asks for -- the copy
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
 *
 * The social links are the same three accounts the sidebar footer shows, from
 * the same `lib/socials` list, and here they are spelled out: the lowercase
 * words the sidebar already uses, in the display face -- the register every
 * other link on the site wears ("view all projects", "visit site", "back to
 * home" are the same mouthful). An earlier pass hid them behind icon-only
 * round buttons to keep the row's one job singular; the rings read as a
 * second row of chrome next to the primary, and words say "reference" more
 * quietly, so the names are the labels themselves now -- no separate title
 * casing for pointers, no aria-label to drift out of sync. Each ends in the
 * up-right arrow, the site's "this leaves the page" mark, because these three
 * do.
 *
 * The primary keeps the row's strongest ink: the row should have exactly one
 * obvious next step. It is unfilled -- the old ink fill inverted to a white
 * pill in dark mode and took the whole row's attention -- so its weight comes
 * from colour and the down-arrow, not a painted box. It also sits one extra
 * step to the right of the social links (`margin-right` in hero.css), so the
 * row reads "one step, then references" rather than four equal words.
 */
export default function HeroActions() {
  return (
    <div className="hero-actions">
      <a href="#projects" className="hero-action-primary">
        <span>view projects</span>
        <ArrowDown
          size={14}
          strokeWidth={1.7}
          aria-hidden="true"
          className="hero-action-arrow"
        />
      </a>

      {SOCIAL_ITEMS.map(({ label, href }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="hero-social-link"
        >
          <span>{label}</span>
          {/* Decorative: the link already announces itself, so the mark is
              `aria-hidden` rather than being read out as "up-right arrow". */}
          <ArrowUpRight
            size={12}
            strokeWidth={1.7}
            aria-hidden="true"
            className="hero-social-arrow"
          />
        </a>
      ))}
    </div>
  );
}
