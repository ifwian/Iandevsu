"use client";

import { type ComponentType } from "react";
import { Code2, GraduationCap, MapPin, Sparkles } from "lucide-react";

/**
 * A section-scoped icon slot. Modelled the same way `Hero.tsx` models its social
 * icons, so a fact cannot be added without one -- the type is what stops a fact
 * quietly rendering with a header and no icon.
 *
 * `strokeWidth` is declared because every call site passes it: lucide defaults
 * to 2, which at 13px is heavier than the 1.7 the hero's social glyphs and the
 * build-panel dots use at their sizes. Declaring it keeps this a local type
 * rather than reaching for `LucideIcon`, which would import the whole icon set
 * into this file's types.
 */
interface WidgetIconProps {
  size?: number;
  strokeWidth?: number;
  className?: string;
}

type WidgetIcon = ComponentType<WidgetIconProps>;

interface Fact {
  label: string;
  /** `tight` trades a little tracking for one line, for the long labels. */
  tight?: boolean;
  value: string;
  Icon: WidgetIcon;
}

/**
 * The four quick facts.
 *
 * `tight` is set on the two labels wide enough to wrap at 11px ("first line of
 * code", "when not coding"). It narrows their letter-spacing rather than
 * dropping them a font-size, so all four labels keep the same optical weight.
 */
const FACTS: Fact[] = [
  { label: "based in", value: "Calamba, PH", Icon: MapPin },
  { label: "currently", value: "2nd Year · BS Computer Science", Icon: GraduationCap },
  { label: "first line of code", value: "HTML · Age 17", tight: true, Icon: Code2 },
  { label: "when not coding", value: "Photography · Badminton · Music", tight: true, Icon: Sparkles },
];

/**
 * The `key ..... value` readout that pairs with the narrative column.
 *
 * These are deliberately a DIFFERENT set of facts from the four widgets below.
 * The earlier arrangement put nothing here, and the tempting move -- copying
 * "based in" and "currently" up into this column -- would have had the same two
 * facts printed twice inside one 850px window, which is worse than either
 * layout alone. So the widgets own the four personal facts and this block owns
 * the ones only the narrative mentions in passing: where the degree comes from,
 * when it finishes, and what the time is going into.
 *
 * Every value is already stated elsewhere in this codebase (`Education.tsx` for
 * the school, the dates and the stack; this file's own second paragraph for the
 * focus), so nothing here asserts a new claim about the person.
 */
const SPEC_ROWS: { key: string; value: string }[] = [
  { key: "school", value: "City College of Calamba" },
  { key: "duration", value: "2025 — 2029" },
  { key: "focus", value: "frontend · backend · databases" },
];

const STACK: string[] = ["HTML", "CSS", "JavaScript", "Java", "C++", "C#", "Python", "SQL"];

export default function AboutMe() {
  return (
    <section 
      id="about" 
      className="section-frame px-5 py-16 lg:px-6"
      style={{ fontFamily: "var(--font-mono)" }}
    >
      <div className="w-full max-w-4xl mx-auto">
        <div className="section-shell">
          {/* The eyebrow moved into the title bar, where it is the section's
              label on a shared control. It is still the same `.section-eyebrow`
              every other section uses -- the bar only zeroes its bottom margin
              and adds ellipsis, so the typography is untouched. */}
          <div className="section-shell-bar">
            <p className="section-eyebrow">02 &mdash; about</p>
          </div>

          <div className="scanlines" aria-hidden="true" />

          <div className="section-shell-body">
        {/* Still `.section-title`, so this heading stays on the same scale as
            the other six section headings -- see the note above `.title-row`
            in theme.css for why it deliberately does not grow.

            The cursor is a decorative block rather than an underscore glyph,
            because `_` is not in every mono face loaded here. */}
<h2 className="section-title title-row">
          <span>about me</span>
        </h2>

        {/* Two columns at `lg` and up, one below.

            The 1.45fr/1fr split is doing the real work: the narrative keeps a
            ~480px measure at 17px serif, which lands at roughly 62 characters a
            line -- the comfortable band for this size. An even split would put
            the prose at ~400px and start breaking lines mid-phrase, and a 2fr/1fr
            would let the measure stretch past where the eye wants it.

            `items-start` so the specs block takes its own height instead of
            stretching to match the prose; a right column of stacked key/value
            rows stretched to 400px reads as a list that has been left out too
            long. */}
        <div className="mt-6 grid grid-cols-1 items-start gap-7 lg:grid-cols-[1.45fr_1fr] lg:gap-8">
          <div className="about-prose">
            <p>
              I&rsquo;m a second-year Computer Science student based in{" "}
              {/* The two lifted phrases are the ones a reader skims for: where
                  they are, and what they are actually here to do. Both go to
                  full `--ink` with a thin ink rule, so they read as emphasis
                  without a second colour -- the monochrome system's answer to
                  a highlight. */}
              <span className="about-em">Calamba, Philippines</span>, currently
              learning how to turn ideas into working web applications. I enjoy building things, figuring out
              why they break, and slowly getting better at the parts I&rsquo;m still learning.
            </p>
            <p>
              Most of what I know comes from school, personal projects, and a lot of trial and error. I&rsquo;m
              still growing as a developer, but I&rsquo;m actively exploring{" "}
              <span className="about-em">frontend development, backend development, and databases</span>, and
              the tools behind modern web applications.
            </p>
          </div>

          {/* A terminal spec dump. `.build-panel` + `.build-panel-bar` rather than
              a new box, so this is the same window chrome as the hero's "i like
              to build" panel at one more depth. */}
          <div className="build-panel about-specs relative">
            <div className="build-panel-bar about-specs-bar">
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
              <span className="min-w-0 truncate">profile.spec</span>
            </div>

            <div className="about-specs-rows">
              {SPEC_ROWS.map((row) => (
                /* The leader is decorative: a screen reader reads the pair off
                   the markup, so announcing a row of dots would be noise. */
                <div key={row.key} className="about-specs-row">
                  <span className="about-specs-key">{row.key}</span>
                  <span className="about-specs-leader" aria-hidden="true" />
                  <span className="about-specs-value">{row.value}</span>
                </div>
              ))}
            </div>

            <div className="about-specs-stack">
              <p className="micro-label mb-2.5">technical foundation</p>
              <div className="flex flex-wrap items-center gap-1.5">
                {STACK.map((item) => (
                  <span key={item} className="pill">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Facts, rebuilt as terminal micro-widgets.

            `auto-rows-fr` so the two mobile rows match, and `h-full` so every
            widget fills its cell -- the value is pushed down with `margin-top:
            auto` inside `.about-widget`, so the four values share a baseline
            even though "Photography · Badminton · Music" is three times the
            length of "Calamba, PH" and wraps to two lines. Without that the
            short values would float up next to their labels and the row would
            read as misaligned. */}
        <div className="mt-9 grid auto-rows-fr grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {FACTS.map(({ label, value, tight, Icon }: Fact) => (
            <div key={label} className="about-widget">
              <div className="about-widget-head">
                {/* `aria-hidden` because the label beside it already names the
                    fact; the icon is the same information a second time. */}
                <Icon size={13} strokeWidth={1.7} className="about-widget-icon" aria-hidden="true" />
                <span className={`about-widget-label${tight ? " about-widget-label-tight" : ""}`}>
                  {label}
                </span>
                <span className="about-widget-dot" aria-hidden="true" />
              </div>
              <p className="about-widget-value">{value}</p>
            </div>
          ))}
        </div>
          </div>
        </div>
      </div>
    </section>
  );
}
