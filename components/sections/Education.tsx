"use client";

import type { ReactNode } from "react";
import { Check } from "lucide-react";

interface Credential {
  label: string;
  detail: string;
}

const CERTIFICATIONS: Credential[] = [
  { label: "Python", detail: "Basic" },
  { label: "Java", detail: "Basic" },
  { label: "JavaScript", detail: "Inter." },
];

const FOUNDATION: string[] = ["C++", "Java", "Python", "C#", "HTML", "CSS", "JavaScript", "SQL"];

const LEARNING: { title: string; detail: string }[] = [
  {
    title: "Web Development",
    detail: "Building responsive websites with HTML, CSS & JS",
  },
  {
    title: "Programming",
    detail: "Exploring Java, C++ and object-oriented programming",
  },
  {
    title: "Database Systems",
    detail: "Learning SQL, queries and database design",
  },
];

/**
 * One column of the education/certifications pair.
 *
 * `h-full` plus the grid's default `align-items: stretch` is what makes the two
 * cards the same height -- a grid item already fills its row, so the explicit
 * height is belt-and-braces, but it is what stops the shorter column collapsing
 * to its content if this is ever moved out of a grid.
 *
 * `flex flex-col` so the heading is a real flex row rather than a block that
 * merely looks like one: it keeps the heading pinned to the top and lets the
 * list below take the remaining space, so the two cards' headings sit on the
 * same baseline even when one list is longer. `p-5` is the single source for
 * the inner padding, so both cards gutter identically.
 */
function PanelCard({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <div className="card flex h-full flex-col border border-[var(--gray-200)] bg-[var(--gray-50)] p-5">
      <p
        className="micro-label mb-4 font-medium"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {heading}
      </p>
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}

export default function Education() {

  return (
    <section 
      id="education" 
      className="section-frame px-5 py-16 lg:px-6"
      style={{ fontFamily: "var(--font-mono)" }}
    >
      <div className="w-full max-w-4xl mx-auto">
        <p className="section-eyebrow mb-1 font-medium">05 &mdash; education</p>

        <h2 
          className="mb-2 text-xl sm:text-2xl font-semibold tracking-tight text-[var(--ink)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          education &amp; certifications
        </h2>

        {/* Section description -- prose, so Source Serif 4. */}
        <p
          className="mb-8 max-w-xl text-[15px] leading-[1.7] text-[var(--gray-400)]"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Where I&rsquo;ve studied, what I&rsquo;ve learned, and what I&rsquo;m currently building along
          the way.
        </p>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
          <PanelCard heading="education">
            {/* The dates are a label, not prose, so they take the micro-label
                register. "Expected" lives in the line below rather than
                inline here, which is what keeps this scannable against a
                certification's single year. */}
            <p className="micro-label mb-2 text-[11px] tracking-wider text-[var(--gray-500)]">
              2025 &mdash; 2029
            </p>
            <p
              className="text-sm font-semibold tracking-tight text-[var(--ink)] sm:text-base"
              style={{ fontFamily: "var(--font-display)" }}
            >
              BS Computer Science
            </p>
            <p className="mt-1.5 text-sm text-[var(--gray-400)]" style={{ fontFamily: "var(--font-body)" }}>
              City College of Calamba
            </p>
            <p className="mt-3 text-sm text-[var(--gray-500)]" style={{ fontFamily: "var(--font-body)" }}>
              Currently studying
            </p>
          </PanelCard>

          <PanelCard heading="certifications">
            <p
              className="text-sm font-semibold tracking-tight text-[var(--ink)] sm:text-base"
              style={{ fontFamily: "var(--font-display)" }}
            >
              HackerRank
            </p>
            <p className="micro-label mt-1 text-[11px] tracking-wider text-[var(--gray-500)]">
              2026
            </p>
            {/* An inline SVG tick rather than a "✓" character: the check glyph
                is not in every mono face the project loads, and a missing
                glyph would render as a tofu box. It is aria-hidden because the
                list is already a list -- the tick carries no information the
                semantics do not.

                `--accent-positive` rather than a hex: it aliases the muted
                green already in the palette, so this reads as "earned" in the
                same voice as an active status dot without inventing a second
                green. The tick is the only coloured thing in the section, and
                the certification names stay gray, so the accent is a
                confirmation mark and not the thing being read. */}
            <ul className="mt-4 space-y-2">
              {CERTIFICATIONS.map((cert) => (
                <li key={cert.label} className="flex items-center gap-2 text-sm">
                  <Check
                    size={13}
                    strokeWidth={2.2}
                    aria-hidden="true"
                    className="shrink-0 text-[var(--accent-positive)]"
                  />
                  <span className="text-[var(--gray-400)]" style={{ fontFamily: "var(--font-body)" }}>
                    {cert.label}
                    <span className="text-[var(--gray-500)]"> &mdash; {cert.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
          </PanelCard>
        </div>

        {/* Technical Foundation. A flat wrap of .pill rather than cards: these
            are labels, not interactive things, and .pill is the project's
            existing tag primitive.

            The hover is `transition-colors` on the border and text only, which
            is the treatment the other .pill call sites already use (the chat
            quick-replies and the LifeOutsideIDE tags). Deliberately not a
            transform or a background fill: these are not clickable, and a lift
            on hover would imply an action that does not exist. Border goes
            gray-300 -> ink so it reads as a quiet emphasis. */}
        <div className="mt-12">
          <p
            className="micro-label mb-3 text-[11px] font-medium uppercase tracking-wider text-[var(--gray-500)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            technical foundation
          </p>
          <div className="flex flex-wrap gap-2">
            {FOUNDATION.map((item) => (
              <span
                key={item}
                className="pill transition-colors duration-200 hover:border-[var(--ink)] hover:text-[var(--ink)]"
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* Currently Learning. The `01 / 02 / 03` counter is the same register
            as Hero's "i like to build" list, so the numbering style matches
            across the two.

            Alignment: the counter and the heading are both display-font at
            text-sm, so they share a line box and the counter needs no manual
            nudge -- `items-baseline` on the row locks them to the same
            baseline regardless of what the two spans resolve to. The heading
            carries an explicit `leading-[1.4]` so its box is a predictable
            height, which is what makes the `mt-1` gap to the description
            identical on all three rows rather than drifting with each
            description's length. The em dash stays inside the heading span so
            it is set in the display face at the heading's weight, matching how
            the Hero separates its numbered lines. */}
        <div className="mt-12">
          <p
            className="micro-label mb-4 text-[11px] font-medium uppercase tracking-wider text-[var(--gray-500)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            currently learning
          </p>
          <ol className="max-w-xl space-y-4">
            {LEARNING.map((item, index) => (
              <li key={item.title} className="flex items-baseline gap-3">
                <span
                  className="w-5 shrink-0 text-[12px] leading-[1.4] text-[var(--gray-400)]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <p
                    className="text-sm font-semibold leading-[1.4] tracking-tight text-[var(--ink)]"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {item.title}
                    <span className="text-[var(--gray-400)]"> &mdash; </span>
                  </p>
                  <p
                    className="mt-1 text-sm leading-[1.6] text-[var(--gray-400)]"
                    style={{ fontFamily: "var(--font-body)" }}
                  >
                    {item.detail}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
