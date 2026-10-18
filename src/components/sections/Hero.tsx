"use client";

import "@/components/hero/hero.css";
import HeroActions from "@/components/hero/HeroActions";
import HeroIntro from "@/components/hero/HeroIntro";
import HeroPortrait from "@/components/hero/HeroPortrait";
import HeroQuote from "@/components/hero/HeroQuote";
import HeroStats from "@/components/hero/HeroStats";

export default function Hero() {
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
              background; both live in hero.css, where the card's one inner
              inset (32px) is declared. The bar above is overridden to the
              same 32px horizontally so the path and the name beneath it stay
              on one left edge. */}
          <div className="hero-body">
            {/* One row from 720px up -- a fixed 240px portrait column beside
                the content column, 40px apart and top-aligned -- stacked into
                a single column below 720px, portrait first. The step lives in
                hero.css because 720px is the card's own breakpoint: `md` is
                768px and `sm` is 640px, and neither is where the portrait
                stops fitting beside the copy. */}
            <div className="hero-layout">
              <HeroPortrait />

              {/* `flex: 1` from 720px up, so the column takes everything the
                  fixed portrait does not; below that it is the full width of
                  the stacked column. Copy is left-aligned at every width --
                  the portrait's left edge and the eyebrow's are the same
                  line. */}
              <div className="hero-column">
                <HeroIntro />

                <HeroQuote />

                <HeroActions />
              </div>
            </div>
          </div>

          <HeroStats />
        </div>
      </div>
    </section>
  );
}
