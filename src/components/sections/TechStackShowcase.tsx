"use client";

import { useState } from "react";
import TechIcon, { type TechIconName } from "@/components/icons/TechIcon";
import GithubIcon from "@/components/icons/GithubIcon";

/**
 * The 04 stack section: what she reaches for, in one list, in two views.
 *
 * The list is the single source for both. "view all stack" groups it by layer;
 * the resting view filters the same array on `peek`. That replaces the two
 * hand-maintained arrays this section used to carry -- `PEEK_STACK` repeated
 * seven of `FULL_STACK_DATA`'s sixteen entries, so a technology added to one
 * and missed in the other simply did not exist on the section until someone
 * noticed.
 *
 * Every mark is the site's own (`components/icons`), not the Devicon glyphs
 * this used to render: those came from a CDN icon font as brand-coloured
 * marks, which made this the one place on the page with saturated colour --
 * against a system whose whole rule is that the palette is monochrome. The
 * marks inherit `currentColor` from the chip, so they retint with the theme and
 * cannot drift from the page. GitHub is the one filled mark of the set; it is
 * the same `GithubIcon` the sidebar footer and the hero already use, and it
 * carries a name on every chip here, so nothing depends on recognising it.
 *
 * `mark` is typed, not a string: a typo in a technology's key is a build error
 * rather than a chip that renders with no icon and no complaint.
 */
type Group = "frontend" | "backend" | "tools";

interface StackItem {
  name: string;
  mark: TechIconName | "github";
  group: Group;
  /** Also shown in the resting row, not only under "view all stack". */
  peek?: boolean;
}

const STACK: StackItem[] = [
  { name: "HTML5", mark: "html5", group: "frontend", peek: true },
  { name: "CSS3", mark: "css3", group: "frontend", peek: true },
  { name: "JavaScript", mark: "javascript", group: "frontend", peek: true },
  { name: "React", mark: "react", group: "frontend", peek: true },
  { name: "Tailwind CSS", mark: "tailwindcss", group: "frontend", peek: true },
  { name: "Node.js", mark: "nodejs", group: "backend" },
  { name: "Express.js", mark: "express", group: "backend" },
  { name: "Python", mark: "python", group: "backend" },
  { name: "Java", mark: "java", group: "backend" },
  { name: "PostgreSQL", mark: "postgresql", group: "backend" },
  { name: "MySQL", mark: "mysql", group: "backend" },
  { name: "Prisma", mark: "prisma", group: "backend" },
  { name: "Git", mark: "git", group: "tools", peek: true },
  { name: "GitHub", mark: "github", group: "tools", peek: true },
  { name: "Figma", mark: "figma", group: "tools" },
  { name: "VS Code", mark: "vscode", group: "tools" },
];

/** Rendered in the expanded view, in this order. Labels are uppercased by CSS. */
const GROUPS: { id: Group; label: string }[] = [
  { id: "frontend", label: "frontend" },
  { id: "backend", label: "backend" },
  { id: "tools", label: "tools & devops" },
];

/** One mark, from whichever of the site's two icon modules owns it. */
function Mark({ mark }: { mark: StackItem["mark"] }) {
  if (mark === "github") {
    return <GithubIcon size={15} className="stack-chip-mark" />;
  }
  return <TechIcon name={mark} size={15} strokeWidth={1.6} className="stack-chip-mark" />;
}

function Chips({ items }: { items: StackItem[] }) {
  return (
    <div className="stack-chips">
      {items.map((item) => (
        <span key={item.name} className="stack-chip">
          <Mark mark={item.mark} />
          {item.name}
        </span>
      ))}
    </div>
  );
}

export default function TechStackShowcase() {
  const [showAll, setShowAll] = useState(false);

  return (
    <section id="stack" className="section-frame px-5 py-16 lg:px-6">
      <div className="w-full max-w-4xl mx-auto">
        <div className="section-shell">
          {/* The eyebrow and the toggle share the title bar, so they sit on one
              baseline instead of the control floating beside the heading. */}
          <div className="section-shell-bar">
            <p className="section-eyebrow">04 &mdash; stack</p>

            <button
              type="button"
              onClick={() => setShowAll((open) => !open)}
              aria-expanded={showAll}
              className="section-shell-action"
            >
              <span>{showAll ? "show peek" : "view all stack"}</span>
              {/* Decorative: the button's own label already says what it does.
                  It leans out on hover, and turns to point right once the full
                  list is open -- the one state change the control has. */}
              <span className="stack-toggle-arrow" data-open={showAll || undefined} aria-hidden="true">
                &#8599;
              </span>
            </button>
          </div>

          <div className="section-shell-body" data-reveal-group>
            <h2 className="section-title">tech stack</h2>

            <p className="section-lede">
              The tools, frameworks, and platforms I reach for across my projects.
            </p>

            {showAll ? (
              <div className="stack-groups">
                {GROUPS.map((group) => (
                  <div key={group.id} className="stack-group">
                    <p className="micro-label">{group.label}</p>
                    <Chips items={STACK.filter((item) => item.group === group.id)} />
                  </div>
                ))}
              </div>
            ) : (
              <Chips items={STACK.filter((item) => item.peek)} />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
