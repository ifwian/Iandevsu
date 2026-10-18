/**
 * The hero's stat strip: three metric cells (links) and one status cell (tag).
 *
 * The strip is part of the terminal window, so it sits inside the frame against
 * its bottom edge with no `mt-12` -- as a footer of the same card rather than a
 * separate band below it.
 *
 * A metric cell is a link; a status cell is a tag. Modelled as a union so a tag
 * can never carry an href, and a link can never be silently un-navigable.
 */
type StatItem =
  | { label: string; value: string; href: string; external: boolean; tag?: false }
  | { label: string; value: string; tag: true };

export default function HeroStats() {
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
        // exception to the monochrome rule, but the exception exists for the
        // chat inbox, where four triage states have to be told apart at a
        // glance down a column of fifty rows. This cell is one fixed,
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
  );
}
