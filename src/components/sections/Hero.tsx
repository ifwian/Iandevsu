"use client";

import { ArrowDown, ArrowUpRight } from "lucide-react";
import { SOCIAL_ITEMS } from "@/lib/socials";
import PixelTransition from "@/components/ui/PixelTransition";

/**
 * A metric cell is a link; a status cell is a tag. Modelled as a union so a
 * tag can never carry an href, and a link can never be silently un-navigable.
 */
type StatItem =
  | { label: string; value: string; href: string; external: boolean; tag?: false }
  | { label: string; value: string; tag: true };

/**
 * The hero's metadata blocks: a file name and the fields under it.
 *
 * Data rather than markup, because the branch connectors are decided by
 * position -- the last row of a block gets `└──` and the rest `├──` -- and
 * hand-writing that per row is how the two end up disagreeing about which line
 * is the last one.
 *
 * Written lowercase; `.hero-tree-file` and `.hero-tree-key` both uppercase, so
 * `builds.sys` renders as `BUILDS.SYS` and a key like `focus` as `FOCUS` from
 * one casing decision in the stylesheet rather than two in the markup.
 *
 * Held here rather than in `content/profile.ts` on purpose: that file is what
 * the chat persona is fed, and these are captions for the hero, not facts about
 * her. Changing what the assistant knows is a separate decision from changing
 * what the hero says.
 *
 * There is deliberately no role row and no location row, and no `mission.log`
 * block either. The role is already in the strapline under her name; the
 * location is already in the sidebar; and what she is currently working on is
 * the one thing the stat strip's "Building" cell already says. What survives is
 * the line of copy none of those state: what she makes, and then the quote.
 *
 * `builds.sys` is numbered rather than keyed because it is a list of three, not
 * a set of fields -- `01`/`02`/`03` also match the numbered nav in the sidebar,
 * so the two read as the same numbering.
 *
 * `quote.txt` is the other shape: one line of prose with no key beside it, which
 * is a different thing from a field with a value. Modelled as a union so the two
 * cannot be confused -- a `quote` block has no `rows` and a `rows` block has no
 * `quote`, and adding a row to one of them is a compile error rather than a
 * block that renders half as a tree and half as a sentence.
 */
type HeroBlock =
  | { file: string; rows: { key: string; value: string }[] }
  | { file: string; quote: string };

const HERO_BLOCKS: HeroBlock[] = [
  {
    file: "builds.sys",
    rows: [
      { key: "01", value: "websites" },
      { key: "02", value: "little programs" },
      { key: "03", value: "things I probably didn't need to make" },
    ],
  },
  { file: "quote.txt", quote: "Too curious to stick to one thing." },
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

          {/* `relative` so the body and the stats paint above the frame's own
              background.

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
              {/* The portrait, with an indicator above it.

                  The wrapper exists so the hint and the arrow are centred on the
                  photograph rather than on the column. It carries the responsive
                  width and the portrait fills it, which means there is one place
                  that decides how wide the portrait is -- if the hint were ever
                  set wider than the photo, this wrapper would grow with it and
                  the arrow would stop pointing at the picture's middle.

                  The label is not decoration: `PixelTransition` binds
                  `onMouseEnter`/`onMouseLeave` on pointer devices and `onClick`
                  on touch devices, so hovering swaps the portrait and a tap
                  toggles it. Both words are true, which is the only reason to
                  put them on the page.

                  `aria-hidden` on the arrow because the label above it already
                  says what it points at; announcing a chevron adds nothing. The
                  label itself is real text and is read. */}
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

                {/* The information block: two named "files", each a small tree.
                    This replaces a standalone italic quote paragraph and a row
                    of loose numbered pills. The old arrangement asked the eye to
                    read four things that all said the same kind of thing --
                    who she is, what she is building, how she works, where to
                    find her -- as four unrelated shapes. A tree states that they
                    are the same kind of thing, and states it without adding a
                    box: it is the page's own language, spelled out.

                    Two files rather than one, because the two groups answer
                    different questions and merging them flattened that. STACK.TXT
                    is the inventory and it changes; NOW.TXT is the moment and it
                    changes constantly.

                    `<dl>` rather than a `<ul>` of styled divs: every row really
                    is a term and its description, so a screen reader gets that
                    pairing for free instead of hearing four adjacent strings.
                    The branch glyphs are `aria-hidden` -- the structure is in the
                    markup, the glyphs are the decoration on top of it.

                    Keys are mono and values are the body's sans, which is the
                    same register the rest of the sidebar and hero use: mono for
                    chrome, sans for anything a person wrote. */}
                <div className="hero-tree mt-9">
                  {HERO_BLOCKS.map((block) => (
                    <div key={block.file} className="hero-tree-block">
                      <p className="hero-tree-file">{block.file}</p>
                      <dl className="hero-tree-list">
                        {/* A `quote` block is one line with no key, so it is
                            rendered as its own branch rather than mapped: the
                            connector still comes from the same place, and it is
                            `└──` because it is the only -- and therefore the
                            last -- line under this header. */}
                        {"quote" in block ? (
                          <div className="hero-tree-row hero-tree-row--last">
                            <span className="hero-tree-branch" aria-hidden="true">
                              └──
                            </span>
                            <dd className="hero-tree-quote">{block.quote}</dd>
                          </div>
                        ) : (
                          block.rows.map((row, index) => {
                            const last = index === block.rows.length - 1;
                            return (
                              <div
                                key={row.key}
                                className={last ? "hero-tree-row hero-tree-row--last" : "hero-tree-row"}
                              >
                                <span className="hero-tree-branch" aria-hidden="true">
                                  {last ? "└──" : "├──"}
                                </span>
                                <dt className="hero-tree-key">{row.key}</dt>
                                <dd className="hero-tree-value">{row.value}</dd>
                              </div>
                            );
                          })
                        )}
                      </dl>
                    </div>
                  ))}
                </div>

            {/* The email now lives in the sidebar footer, so it is not repeated
                here. The social links stay, since the sidebar no longer has
                them. */}
            {/* `justify-center` below md so a wrapped row of links centres too;
                `w-fit` means the block itself is only as wide as its content,
                which is what lets the `items-center` on the parent column centre
                the whole group as one unit. `mt-8` rather than the `mt-6` it
                carried beside the old pill row: the tree above is taller, and
                24px of air under it read as crowding rather than as a seam. */}
            <div className="mt-8 flex w-fit max-w-full flex-wrap items-start justify-center gap-2 text-left md:justify-start">
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
            same card rather than a separate band below it. */}
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

            // The status cell: a pulsing dot immediately left of the word.
            //
            // `--ink`, not `--status-active`. That green was the sanctioned
            // exception to the monochrome rule, but the exception exists for
            // the chat inbox, where four triage states have to be told apart at
            // a glance down a column of fifty rows. This cell is one fixed,
            // permanently-pulsing dot next to the fixed word "Building" -- there
            // is no state to disambiguate and no scan to speed up, so a hue here
            // was decoration spending the one accent the palette has. The pulse
            // still carries "this is live"; it no longer costs a colour to say
            // it, and the ping is kept rather than dropped for the same reason.
            if (stat.tag) {
              return (
                <div key={stat.label} className={cellClass} style={{ fontFamily: "var(--font-mono)" }}>
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
                      <span
                        className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
                        style={{ backgroundColor: "var(--ink)" }}
                      />
                      <span
                        className="relative inline-flex h-2 w-2 rounded-full"
                        style={{ backgroundColor: "var(--ink)" }}
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
