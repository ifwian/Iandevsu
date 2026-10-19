import { HERO } from "@/content/hero";
import { PROJECTS } from "@/content/projects";
import { getProjectStats } from "@/lib/projectStats";

/**
 * The hero's stat strip: four cells along the bottom of the terminal window.
 *
 * The strip is part of the window, so it sits inside the frame against its
 * bottom edge -- a footer of the same card rather than a separate band below
 * it.
 *
 * Every cell has the same shape now: one line of value (never wrapped -- the
 * cells are equal by contract, so a value that outgrows its cell ellipsises
 * rather than pushing its neighbours), a label under it, and the ↗ at the
 * top-right that marks the cell as a link. All four are links, because all
 * four have somewhere worth going. The status cell's one extra mark is the
 * pulsing dot in front of the value -- the dot is the whole difference
 * between it and its neighbours.
 */

/**
 * One cell of the strip. `pulse` adds the indicator light in front of the
 * value; `external` adds the new-tab targets.
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
    // "Nothing yet" is a guard for the empty-list case -- with the current
    // list the cell always names a project.
    {
      label: "Now building",
      value: building ? building.title : "Nothing yet",
      href: building ? building.anchor : "#projects",
      pulse: true,
    },
  ];

  return (
    <div className="hero-stats">
      {stats.map((stat) => (
        <a
          key={stat.label}
          href={stat.href}
          target={stat.external ? "_blank" : undefined}
          rel={stat.external ? "noopener noreferrer" : undefined}
          className="hero-stat"
        >
          <span className="hero-stat-arrow" aria-hidden="true">
            ↗
          </span>

          <span className="hero-stat-value">
            {/* The status cell's indicator: a pulsing dot immediately left of
                the project name.

                `--ink`, not `--status-active`. That green was the sanctioned
                exception to the monochrome rule, but the exception exists for
                the chat inbox, where four triage states have to be told apart
                at a glance down a column of fifty rows. This cell is one
                fixed, permanently-pulsing dot next to one line of text --
                there is no state to disambiguate and no scan to speed up, so
                a hue here was decoration spending the one accent the palette
                has. The pulse still carries "this is live"; it no longer
                costs a colour to say it, and the ping is kept rather than
                dropped for the same reason. */}
            {stat.pulse ? (
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
            ) : null}
            <span className="hero-stat-text">{stat.value}</span>
          </span>

          <span className="hero-stat-label">{stat.label}</span>
        </a>
      ))}
    </div>
  );
}
