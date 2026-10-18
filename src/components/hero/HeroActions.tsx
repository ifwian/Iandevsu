import { ArrowDown } from "lucide-react";
import { SOCIAL_ITEMS } from "@/lib/socials";

/**
 * The hero's action row: the primary step, then the social links.
 *
 * "View projects" is the single next step the column asks for -- the copy
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
 * the same `lib/socials` list, and they are icon-only round buttons here: the
 * old pill row spelled "github / linkedin / instagram" out in text and made
 * five chips of one kind compete in a row. Three 40px marks beside the one
 * button, named for assistive tech and titled for pointers, say the same
 * thing with less to read.
 *
 * The accessible names are the brands' own casing ("GitHub", not "github").
 * `lib/socials` keeps the site's lowercase mono register for the sidebar,
 * which shows the labels as text; these two strings are for this surface
 * only.
 */
const SOCIAL_TITLES: Record<string, string> = {
  github: "GitHub",
  linkedin: "LinkedIn",
  instagram: "Instagram",
};

export default function HeroActions() {
  return (
    <div className="hero-actions">
      <a href="#projects" className="hero-action-primary">
        <span>View projects</span>
        <ArrowDown
          size={14}
          strokeWidth={1.7}
          aria-hidden="true"
          className="hero-action-arrow"
        />
      </a>

      {SOCIAL_ITEMS.map(({ label, href, Icon }) => {
        const title = SOCIAL_TITLES[label] ?? label;
        return (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={title}
            title={title}
            className="hero-social-link"
          >
            <Icon size={15} />
          </a>
        );
      })}
    </div>
  );
}
