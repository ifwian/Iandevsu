import { HERO } from "@/content/hero";
import { PROJECTS } from "@/content/projects";
import { getProjectStats } from "@/lib/projectStats";

/**
 * The hero's stat strip: four cells along the bottom of the terminal window.
 *
 * The strip is part of the window, so it sits inside the frame against its
 * bottom edge with no `mt-12` -- as a footer of the same card rather than a
 * separate band below it.
 *
 * Three cells are metrics and one is a status, and all four are links, because
 * all four have somewhere worth going. The status cell points at the projects
 * section, where the thing it names can actually be seen, and its mark is the
 * pulsing dot rather than the ↗: what it says is "this is happening", not
 * "here is a number".
 */

/**
 * One cell of the strip. `pulse` swaps the ↗ for the indicator light;
 * `external` adds the new-tab targets.
 */
interface StatItem {
  label: string;
  value: string;
  href: string;
  external?: boolean;
  pulse?: boolean;
}

export default function HeroStats() {
  const { live, active, building } = getProjectStats(PROJECTS);
  const projectCount = live + active;

  const stats: StatItem[] = [
    { label: "Repos", value: HERO.github.repos, href: "https://github.com/ifwian?tab=repositories", external: true },
    { label: "Commits", value: HERO.github.commits, href: "https://github.com/ifwian", external: true },
    // Templates are not counted as projects (see `getProjectStats`); the
    // breakdown keeps the headline number checkable against the section.
    {
      label: `${live} live · ${active} in progress`,
      value: `${projectCount} ${projectCount === 1 ? "project" : "projects"}`,
      href: "#projects",
    },
    // The status cell: the project comes from the list, so the strip cannot
    // name something the section does not show; the link goes to the
    // project's own page when it has one, and to the section otherwise.
    {
      label: "Current focus",
      value: building ? `Building: ${building.title}` : "Building",
      href: building ? building.anchor : "#projects",
      pulse: true,
    },
  ];

  return (
    <div className="hero-stats">
      {stats.map((stat) => {
        // The grid, the hairlines between cells and the hover tint are all in
        // hero.css (`.hero-stats`, `.hero-stat`), where the strip's 720px step
        // lives -- the same breakpoint the card layout changes at, and one
        // pair of values the two cannot disagree about.
        const linkClass = "hero-stat group";

        // The status cell: a pulsing dot immediately left of the project.
        //
        // `--ink`, not `--status-active`. That green was the sanctioned
        // exception to the monochrome rule, but the exception exists for the
        // chat inbox, where four triage states have to be told apart at a
        // glance down a column of fifty rows. This cell is one fixed,
        // permanently-pulsing dot next to one line of text -- there is no
        // state to disambiguate and no scan to speed up, so a hue here was
        // decoration spending the one accent the palette has. The pulse still
        // carries "this is live"; it no longer costs a colour to say it, and
        // the ping is kept rather than dropped for the same reason.
        if (stat.pulse) {
          return (
            <a
              key={stat.label}
              href={stat.href}
              className={linkClass}
              style={{ fontFamily: "var(--font-mono)" }}
            >
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
              <span className="mt-1 text-[13px] font-normal text-[var(--gray-500)]">
                {stat.label}
              </span>
            </a>
          );
        }

        return (
          <a
            key={stat.label}
            href={stat.href}
            target={stat.external ? "_blank" : undefined}
            rel={stat.external ? "noopener noreferrer" : undefined}
            className={linkClass}
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
              className="mt-1 text-[13px] font-normal text-[var(--ink)]"
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
