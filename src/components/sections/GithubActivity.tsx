"use client";

import { useEffect, useState } from "react";

const GITHUB_USERNAME = "ifwian";

interface ContributionDay {
  date: string;
  count: number;
  level: number;
}

interface ApiResponse {
  contributions?: ContributionDay[];
  total?: Record<string, number> | number;
}

const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "short" });

function toWeeks(days: ContributionDay[]): (ContributionDay | null)[][] {
  const weeks: (ContributionDay | null)[][] = [];
  let current: (ContributionDay | null)[] = [];

  days.forEach((day, i) => {
    const weekday = new Date(`${day.date}T00:00:00`).getDay();
    if (i === 0) {
      for (let pad = 0; pad < weekday; pad++) current.push(null);
    }
    current.push(day);
    if (weekday === 6 || i === days.length - 1) {
      while (current.length < 7) current.push(null);
      weeks.push(current);
      current = [];
    }
  });

  return weeks;
}

const LEVEL_CLASSES: Record<number, string> = {
  0: "bg-[var(--gray-100)] border border-[var(--gray-200)] hover:border-[var(--gray-300)]",
  1: "bg-[var(--gray-200)] hover:bg-[var(--gray-300)]",
  2: "bg-[var(--gray-300)] hover:bg-[var(--gray-400)]",
  3: "bg-[var(--gray-400)] hover:bg-[var(--gray-300)]",
  4: "bg-[var(--ink)] hover:bg-[var(--gray-100)]",
};

export default function GithubActivity() {
  const [weeks, setWeeks] = useState<(ContributionDay | null)[][] | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`https://github-contributions-api.jogruber.de/v4/${GITHUB_USERNAME}?y=2026`);
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        const data: ApiResponse = await res.json();
        const contributions = data.contributions ?? [];
        if (!contributions.length) throw new Error("No contribution data returned");
        if (cancelled) return;

        setWeeks(toWeeks(contributions));
        const calculatedTotal = contributions.reduce((sum, day) => sum + day.count, 0);
        setTotal(calculatedTotal);
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const monthLabels = weeks
    ? weeks.reduce<{ text: string; weekIndex: number }[]>((acc, week, i) => {
        const firstDay = week.find((d) => d !== null);
        if (!firstDay) return acc;
        const monthText = monthFormatter.format(new Date(`${firstDay.date}T00:00:00`));
        if (acc.length === 0 || acc[acc.length - 1].text !== monthText) {
          acc.push({ text: monthText, weekIndex: i });
        }
        return acc;
      }, [])
    : [];

  const totalWeeks = weeks?.length ?? 53;

  return (
    <section 
      id="github" 
      className="section-frame px-5 py-16 lg:px-6"
      style={{ fontFamily: "var(--font-mono)" }}
    >
      <div className="w-full max-w-4xl mx-auto">
        <div className="section-shell">
          {/* Eyebrow and profile link share the title bar, so the handle sits on
              the same baseline as the label rather than beside the heading. */}
          <div className="section-shell-bar">
            <p className="section-eyebrow">07 &mdash; github</p>
            <a
              href={`https://github.com/${GITHUB_USERNAME}`}
              target="_blank"
              rel="noopener noreferrer"
              className="section-shell-action"
            >
              @{GITHUB_USERNAME} <span>&#8599;</span>
            </a>
          </div>


          <div className="section-shell-body">
        {/* Section Heading */}
        <h2 className="section-title">
          github activity
        </h2>

        {/* Description */}
        <p className="mb-8 max-w-xl text-xs sm:text-sm leading-relaxed text-[var(--gray-500)]">
          A snapshot of my contribution history for 2026.
        </p>

        {/* Card Container with Smooth Box Hover Effects.
            The `hover:shadow-[...]` utility that used to sit here is gone rather
            than corrected. `.card` already carries `box-shadow:
            var(--shadow-resting)` and a `:hover` rule lifting to
            `var(--shadow-hover)` with a 0.35s transition, so the utility was
            overriding a themed token with a hardcoded `rgb(0,0,0,0.3)` -- a
            value tuned for the dark palette, which reads as a grey smudge in
            light mode. Deleting it restores the token for both themes. */}
        <div 
          className="card flex flex-col p-4 sm:p-6 lg:p-8 rounded-xl bg-[var(--gray-50)] border border-[var(--gray-200)] transition-all duration-300 hover:border-[var(--gray-300)] hover:bg-[var(--gray-100)]"
        >
          {/**
           * Horizontal scroller for the month labels and the grid together.
           *
           * A year is 53 columns and the day cells are `1fr` with a 2-3px gap.
           * Squeezing that into a phone width left each day around 2.7px -- not
           * an overflow, but a graph nobody could read or tap, and `hover:scale-125`
           * on a 2.7px cell does nothing at all.
           *
           * So the pair scrolls instead of shrinking: the inner block holds a
           * floor width that keeps the cells legible, and below that the card
           * scrolls sideways. At `sm` and up there is more room than the floor
           * needs, so it never actually scrolls and the card looks untouched.
           *
           * The labels live inside the scroller rather than above it because they
           * are positioned as a percentage of the grid's width -- outside, they
           * would stay put while the grid moved and drift off their months.
           *
           * `pb-1` keeps the last row of cells off the scrollbar edge, and
           * `overscroll-x-contain` stops a sideways flick here from hijacking the
           * page's own vertical scroll.
           */}
          <div className="w-full overflow-x-auto overscroll-x-contain pb-1">
            <div className="min-w-[22rem] sm:min-w-0">
              {/* Month Labels */}
              <div 
                className="relative h-4 w-full mb-3 text-[11px] text-[var(--gray-400)] uppercase"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {monthLabels.map((m) => {
                  /**
                   * Each label is anchored to the week its month starts on, as a
                   * percentage. December's anchor is around 98% of the width, and
                   * `whitespace-nowrap` means the label cannot reflow -- so the
                   * default left-anchored render ran the full width of the word
                   * past the right edge.
                   *
                   * Fixed by pulling the trailing labels back by their own width,
                   * so their right edge lands on the anchor instead of their left.
                   * Three steps rather than a binary flip, because a single month
                   * is narrower than the space the last two or three share.
                   */
                  const ratio = m.weekIndex / totalWeeks;
                  const pullBack = ratio > 0.94 ? "-translate-x-full" : ratio > 0.86 ? "-translate-x-1/2" : "";

                  return (
                    <span
                      key={m.text + m.weekIndex}
                      className={`absolute whitespace-nowrap ${pullBack}`.trim()}
                      style={{ left: `${ratio * 100}%` }}
                    >
                      {m.text}
                    </span>
                  );
                })}
              </div>

              {/* Contribution Grid. `auto-rows-fr` is not used here because the
                  cells are square by `aspect-square` and the row height is set
                  by the seven-row track list below. */}
              <div
                className="grid w-full gap-[2px] sm:gap-[3px]"
                style={{
                  gridTemplateColumns: `repeat(${totalWeeks}, 1fr)`,
                  gridTemplateRows: "repeat(7, 1fr)",
                  gridAutoFlow: "column",
                }}
              >
              {weeks?.map((week, wi) =>
                week.map((day, di) => {
                  const levelClass = day
                    ? LEVEL_CLASSES[day.level] ?? LEVEL_CLASSES[0]
                    : "bg-transparent border-transparent";
                  
                  return (
                    <div
                      key={`${wi}-${di}`}
                      title={
                        day
                          ? `${day.count} contribution${day.count === 1 ? "" : "s"} on ${day.date}`
                          : undefined
                      }
                      className={`w-full aspect-square rounded-[2px] cursor-pointer transition-all duration-150 hover:scale-125 hover:z-10 ${levelClass}`}
                    />
                  );
                })
              )}
              </div>
            </div>
          </div>

          {/* Footer Summary & Legend */}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--gray-400)] pt-3 border-t border-[var(--gray-200)]">
            <p 
              style={{ 
                fontFamily: total !== null ? "var(--font-display)" : "var(--font-mono)"
              }}
            >
              {error
                ? "Couldn't load live GitHub activity right now — check back later."
                : total !== null
                  ? `${total.toLocaleString()} contributions in 2026`
                  : "Loading contribution activity…"}
            </p>

            {/* Legend */}
<div 
              className="flex items-center gap-1.5 text-[11px] text-[var(--gray-400)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              <span>Less</span>
              <div className="flex gap-1">
                <span className="w-2.5 h-2.5 rounded-[2px] bg-[var(--gray-100)] border border-[var(--gray-200)]" />
                <span className="w-2.5 h-2.5 rounded-[2px] bg-[var(--gray-200)]" />
                <span className="w-2.5 h-2.5 rounded-[2px] bg-[var(--gray-300)]" />
                <span className="w-2.5 h-2.5 rounded-[2px] bg-[var(--gray-400)]" />
                <span className="w-2.5 h-2.5 rounded-[2px] bg-[var(--ink)]" />
              </div>
              <span>More</span>
            </div>
          </div>
            
        </div>
          </div>
        </div>
      </div>
    </section>
  );
}
