"use client";

import { type ComponentType } from "react";
import { ArrowUpRight } from "lucide-react";
import GithubIcon from "@/components/icons/GithubIcon";
import PixelTransition from "@/components/ui/PixelTransition";

interface SocialIconProps {
  size?: number;
  className?: string;
}

type SocialIcon = ComponentType<SocialIconProps>;

interface SocialItem {
  label: string;
  href: string;
  Icon: SocialIcon;
}

/**
 * A metric cell is a link; a status cell is a tag. Modelled as a union so a
 * tag can never carry an href, and a link can never be silently un-navigable.
 */
type StatItem =
  | { label: string; value: string; href: string; external: boolean; tag?: false }
  | { label: string; value: string; tag: true };

const SOCIAL_ITEMS: SocialItem[] = [
  { label: "github", href: "https://github.com/ifwian", Icon: GithubIcon },
  { label: "linkedin", href: "https://www.linkedin.com/in/ifwiannn/", Icon: LinkedinIcon },
  { label: "instagram", href: "https://www.instagram.com/ifwiannn/", Icon: InstagramIcon },
];

function LinkedinIcon({ size = 15, className }: SocialIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M6 8.5V18" />
      <path d="M6 5.5v.01" />
      <path d="M10 18v-5.25a3.25 3.25 0 0 1 6.5 0V18" />
      <path d="M10 12.5V18" />
    </svg>
  );
}

function InstagramIcon({ size = 15, className }: SocialIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.4" cy="6.6" r=".8" fill="currentColor" stroke="none" />
    </svg>
  );
}

const BUILDS: string[] = [
  "websites",
  "little programs",
  "things I probably didn't need to make",
];

export default function Hero() {
  const stats: StatItem[] = [
    { label: "REPOS", value: "12 Public", href: "https://github.com/ifwian?tab=repositories", external: true },
    { label: "COMMITS", value: "105+", href: "https://github.com/ifwian", external: true },
    { label: "PROJECTS", value: "5 Done", href: "#projects", external: false },
    // A live status, not a metric: rendered as a non-navigating tag with an
    // indicator light, so it is never mistaken for a link like the other three.
    // The label was "building" against a value of "Building" -- the same word
    // twice, and the label's `uppercase` made it read as "Building / BUILDING".
    // "CURRENT FOCUS" is what the cell is actually saying: this is what the
    // portfolio is currently about, not a tally.
    { label: "current focus", value: "Building", tag: true },
  ];

  return (
    <section
      id="home"
      /* `lg:pt-0`: the hero is the page's FIRST section, so the space above it
         is already reserved by <main>'s own `lg:py-12`. The `pt-8` this replaced
         was a second, redundant reserve stacked on top of it -- 48px + 32px =
         80px of dead space above a 14px marker, against 24px of side margin.
         That is what made the marker look detached from the window under it.

         Below `lg` the fixed 68px top bar floats over the page, so a little extra
         separation is genuinely wanted here and `pt-6` stays.

         `pb-16` is unchanged: it is the hero's half of the inter-section gap,
         which is deliberately larger than its top margin, exactly as on every
         other section. */
      className="section-frame px-5 pt-6 pb-16 lg:px-6 lg:pt-0"
      style={{ fontFamily: "var(--font-mono)" }}
    >
      <div className="w-full max-w-4xl mx-auto">
        {/**
         * The eyebrow sits OUTSIDE the portrait/text row, directly on the
         * container.
         *
         * It used to be the first child of the text column, which meant that from
         * `md` up -- where the row is `flex-row` and the portrait precedes the
         * text -- it started 180px in, past the portrait and the gap. Every
         * other section's eyebrow starts at the container's own left edge, so
         * `01 -- WHO AM I?` was the one marker on the page that did not line up
         * with `02 -- ABOUT` and the rest.
         *
         * The gap to the window below is `.hero-eyebrow-row`'s, not a `mb-*`
         * utility: `.section-eyebrow` brings 0.75rem of its own bottom margin,
         * and the bar-scoped rule that cancels that for sections 02-08 does not
         * reach a marker outside the frame -- so a utility here stacked with it
         * and opened a 36px gulf. See the rule in theme.css.
         */}
        <div className="hero-eyebrow-row text-center md:text-left">
          <p className="section-eyebrow">01 &mdash; who am i?</p>
        </div>

        <div className="hero-frame">
          {/* Window chrome. Three dots, a path, and a live state, so the hero
              reads as a terminal before a word of it is read. The green is
              --status-active, the same token the sidebar's live dot and the
              hero's own "building" stat already use. */}
          <div className="hero-titlebar">
            <span className="flex shrink-0 items-center gap-1.5" aria-hidden="true">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: "var(--gray-300)" }}
              />
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: "var(--gray-300)" }}
              />
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: "var(--gray-300)" }}
              />
            </span>
            {/* `min-w-0` so `truncate` can actually do its job: the path is a
                flex child, and without it the default `min-width: auto` keeps
                the row at its content width and shoves the "online" state off
                the right edge on a narrow phone. */}
            <span className="min-w-0 truncate">~/portfolio &mdash; index.tsx</span>
          </div>

          {/* Texture, under the content. `aria-hidden` and `pointer-events-none`
              so it is neither announced nor clickable. */}
          <div className="scanlines" aria-hidden="true" />

          {/* `relative` so the body and the stats paint above the scanlines,
              which are absolutely positioned against this same frame.

              `p-5 sm:p-6 lg:p-8` -- was `p-5 sm:p-7 lg:p-9`. The vertical step
              at `lg` was 36px (2.25rem), which pushed the card's top and bottom
              breathing past the 1.5-2rem every other bordered surface on the
              site uses (`.section-shell-body` is 1.75rem/2rem) and left the hero
              looking over-padded against the chrome around it. 2rem is the top
              of the shared range; the horizontal step is matched by
              `.hero-titlebar` so the bar's path and the name beneath it stay on
              one left edge. */}
          <div className="relative p-5 sm:p-6 lg:p-8">
            {/* `items-center` is doing two different jobs on either side of `md`,
                and that is exactly right rather than a compromise:

                below md the row is `flex-col`, so the cross axis is horizontal
                and this centres the portrait and the text column on the phone.
                From md up it is `flex-row`, so the cross axis becomes vertical
                and the same property centres the text against the portrait --
                which is what `md:items-center` was added for originally.

                So the hero is centred on a phone and left-aligned from tablet
                up, where the two-column layout has a left edge worth aligning
                to. */}
            <div className="flex flex-col items-center gap-7 md:flex-row md:items-center md:gap-8">
              <PixelTransition
                firstContent={
                  <img
                    src="/images/anime.jpg"
                    alt="Photo of Marianne"
                    className="block h-full w-full object-cover"
                  />
                }
                secondContent={
                  <img
                    src="/images/ianface.png"
                    alt="Photo of Marianne Hover"
                    className="block h-full w-full object-cover"
                  />
                }
                gridSize={7}
                pixelColor="var(--bg)"
                animationStepDuration={0.3}
                className="hero-portrait aspect-[5/6] w-44 shrink-0 overflow-hidden sm:w-52 md:w-[180px] lg:w-[200px]"
              />

              {/* `w-full` with `items-center` + `text-center` below md: the
                  column spans the frame, and its children shrink to their own
                  width and centre within it, so the name, subtitle, quote,
                  numbered list and social row all sit on the phone's centre
                  line. `md:items-start md:text-left` restores the flush-left
                  column at tablet and up, where it sits beside the portrait. */}
              <div className="flex min-w-0 w-full flex-col items-center text-center md:max-w-md md:items-start md:text-left">
                {/* Name takes the display role (Geist Pixel), like every other
                    heading on the site. Sentence case, as written -- unlike
                    .section-eyebrow, an h1 has no text-transform, so the casing
                    here is literally the casing that renders. */}
                <h1 className="hero-name">Marianne Napaño</h1>

                <p className="hero-subtitle">
                  Computer Science Student &middot; Aspiring Web Developer
                </p>

                <div
                  className="mt-6 max-w-[48ch] text-xs leading-relaxed text-[var(--gray-500)] sm:text-sm"
                  style={{ lineHeight: 1.65 }}
                >
                  <p className="italic">“Too curious to stick to one thing.”</p>
                </div>

            {/* "I like to build" as one cohesive terminal panel: a title bar
                with the tracked label, then the three items as a horizontal
                badge row. This replaced a loose label with free-floating pills,
                which read as three unrelated chips -- nothing said they belonged
                together, because there was no shared edge.

                Reuses the hero window's own vocabulary (same hairline, same
                `--gray-100` bar, same trio of chrome dots) so the two title rows
                read as the same component at two depths. The chips keep
                `.terminal-pill`, shared with the social buttons, so the panel is
                cohesive with the rest of the hero without becoming uniform to
                the point of losing the distinction between a link and a label.

                Still a real `<ul>`; the brackets are `aria-hidden` because a
                screen reader gets the order from the list markup. `relative` so
                the panel paints above the scanlines. */}
            <div className="build-panel relative mt-6 w-full">
              <div className="build-panel-bar">
                <span className="flex shrink-0 items-center gap-1" aria-hidden="true">
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: "var(--gray-300)" }}
                  />
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: "var(--gray-300)" }}
                  />
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: "var(--gray-300)" }}
                  />
                </span>
                <span className="min-w-0 truncate">i like to build</span>
              </div>
              <ul className="build-panel-body">
                {BUILDS.map((build, index) => (
                  <li key={build} className="terminal-pill">
                    <span className="build-pill-index" aria-hidden="true">
                      [{String(index + 1).padStart(2, "0")}]
                    </span>
                    <span className="min-w-0">{build}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* The email now lives in the sidebar footer, so it is not repeated
                here. The social links stay, since the sidebar no longer has
                them. */}
            {/* `justify-center` below md so a wrapped row of links centres too;
                `w-fit` means the block itself is only as wide as its content,
                which is what lets the `items-center` on the parent column centre
                the whole group as one unit. */}
            <div className="mt-6 flex w-fit max-w-full flex-wrap items-start justify-center gap-2 text-left md:justify-start">
              {SOCIAL_ITEMS.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  /* `group` stays for the arrow's `group-hover:`; the chip's own
                     box is `.terminal-pill`, shared with the build items above so
                     the two cannot drift apart. The inline `fontFamily` these
                     buttons used to carry is now part of that rule. */
                  className="group terminal-pill"
                >
                  <Icon size={13} />
                  <span>{label}</span>
                  <ArrowUpRight
                    size={11}
                    strokeWidth={1.7}
                    className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  />
                </a>
              ))}
            </div>
          </div>
          </div>
        </div>

        {/* The stat strip is part of the terminal window, so it sits inside the
            frame against its bottom edge with no `mt-12` -- as a footer of the
            same card rather than a separate band below it. `relative` to clear
            the scanlines, which cover the whole frame. */}
        <div className="relative grid grid-cols-2 border-t border-[var(--gray-200)] sm:grid-cols-4">
          {stats.map((stat, index) => {
            // Border logic is shared so the tag cell keeps the same grid rhythm
            // as the link cells.
            const cellClass = `flex flex-col justify-center px-4 py-4 ${
              index !== 0 ? "sm:border-l sm:border-[var(--gray-200)]" : ""
            } ${
              index % 2 === 1 ? "border-l border-[var(--gray-200)]" : ""
            } ${
              index >= 2 ? "border-t border-[var(--gray-200)] sm:border-t-0" : ""
            }`;

            // The status cell: a pulsing light with a soft halo sitting
            // immediately left of the word. `--status-active` rather than the
            // literal `#22c55e` this used to hardcode: `.clinerules` forbids
            // hardcoding a colour, and a fixed hex renders the same in both
            // themes, so it clashed with the dark palette instead of lifting
            // from the token the way every other live indicator on the site does.
            if (stat.tag) {
              return (
                <div key={stat.label} className={cellClass} style={{ fontFamily: "var(--font-mono)" }}>
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
                      <span
                        className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
                        style={{ backgroundColor: "var(--status-active)" }}
                      />
                      <span
                        className="relative inline-flex h-2 w-2 rounded-full"
                        style={{ backgroundColor: "var(--status-active)" }}
                      />
                    </span>
                    <span className="text-base font-semibold tracking-tight text-[var(--ink)] sm:text-lg">
                      {stat.value}
                    </span>
                  </div>
                  <span className="mt-1 text-[11px] font-normal uppercase tracking-widest text-[var(--gray-500)]">
                    {stat.label}
                  </span>
                </div>
              );
            }

            return (
              <a
                key={stat.label}
                href={stat.href}
                target={stat.external ? "_blank" : undefined}
                rel={stat.external ? "noopener noreferrer" : undefined}
                className={`group cursor-pointer transition-colors hover:bg-[var(--gray-100)] ${cellClass}`}
              >
                <div
                  className="flex items-baseline gap-1"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  <span className="text-base font-semibold tracking-tight text-[var(--ink)] sm:text-lg">
                    {stat.value}
                  </span>
                  <span className="text-[11px] text-[var(--gray-400)] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--ink)]">
                    ↗
                  </span>
                </div>
                <span
                  className="mt-1 text-[11px] font-normal uppercase tracking-widest text-[var(--ink)]"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {stat.label}
                </span>
              </a>
            );
          })}
        </div>
      </div>
      </div>
    </section>
  );
}
