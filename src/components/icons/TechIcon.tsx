import type { ReactNode } from "react";

/**
 * Monochrome outline marks for the technologies named in `content/projects.ts`.
 *
 * These replace the Devicon glyphs the project cards used to render. Devicon
 * ships brand-coloured marks as an icon *font*, so a card's preview was a
 * React logo in React blue and a Python logo in Python yellow -- the only
 * saturated colour on the page, against a design system whose one rule is that
 * the palette is monochrome. Desaturating them with `filter: grayscale()` was
 * the previous answer and it was the wrong one twice over: the colour was still
 * in the asset, and a filtered brand mark still reads as a brand mark rather
 * than as part of the page.
 *
 * So the marks are drawn here instead: one weight, `fill: none`,
 * `stroke: currentColor`, one 24px grid, round caps and joins. They inherit the
 * text colour, which means a card preview retints itself with the theme, haloes
 * with the hover, and needs no per-technology colour rule anywhere.
 *
 * Deliberately geometric abstractions rather than traced logos. Tracing the
 * official marks from memory produces shapes that are subtly wrong in a way a
 * visitor recognises without being able to name -- worse than a clean abstract
 * mark. What each one keeps is the silhouette that carries the identity: React's
 * atom, Node's hexagon, Tailwind's double wave, Prisma's prism, the database
 * cylinder, the Mongo leaf, and shields for the two web-platform marks.
 *
 * One optical weight across all eleven is the point of hand-authoring them: an
 * icon font renders at whatever weight the foundry chose, so a row of mixed
 * brands never quite sits level. These do, because they are the same pen.
 *
 * `aria-hidden` always. Every call site either sits beside the technology named
 * in words or is decoration on a card whose text already carries the meaning.
 */

export type TechIconName =
  | "react"
  | "tailwindcss"
  | "nodejs"
  | "express"
  | "postgresql"
  | "prisma"
  | "python"
  | "html5"
  | "javascript"
  | "css3"
  | "mongodb";

interface TechIconProps {
  name: TechIconName;
  /** Rendered width and height in px. The grid is 24, so this is the ratio. */
  size?: number;
  className?: string;
  /**
   * Lighter on the big card preview than in the stack row, because a 1.5px
   * stroke across 48px reads heavier than the same stroke across 15px. The
   * caller sets it rather than this component guessing from `size`, since the
   * two call sites know which one they are.
   */
  strokeWidth?: number;
}

const SHIELD = "M12 3.2 20 6v5.8c0 4.4-3.1 7.7-8 9-4.9-1.3-8-4.6-8-9V6Z";

const MARKS: Record<TechIconName, ReactNode> = {
  // Nucleus plus three orbits: the atom is the whole identity of this mark.
  react: (
    <>
      <circle cx="12" cy="12" r="2.1" />
      <ellipse cx="12" cy="12" rx="9.2" ry="3.6" />
      <ellipse cx="12" cy="12" rx="9.2" ry="3.6" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="9.2" ry="3.6" transform="rotate(120 12 12)" />
    </>
  ),

  // Two crests, which is what separates this mark from a plain wave.
  tailwindcss: (
    <>
      <path d="M3.5 9.5c2.8-2.6 5.6-2.6 8.4 0 2.8 2.6 5.6 2.6 8.6 0" />
      <path d="M3.5 15.5c2.8-2.6 5.6-2.6 8.4 0 2.8 2.6 5.6 2.6 8.6 0" />
    </>
  ),

  // Hexagon, which is the outline of Node's mark on its own, plus an N inside.
  nodejs: (
    <>
      <path d="M12 3.2 19.8 7.6v8.8L12 20.8 4.2 16.4V7.6Z" />
      <path d="M9.6 16.2V8.8l5.2 6.6V8.8" />
    </>
  ),

  // The mark is a disc with a bar through it; outlined, that is a circle and a
  // stroke that crosses into it from the left.
  express: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M3 13.4h13.4" />
    </>
  ),

  // Postgres is the one mark with no honest outline, and a traced elephant head
  // at 15px is a smudge. A cylinder reads as "database" to everyone and is the
  // symbol this row is actually doing the job of.
  postgresql: (
    <>
      <ellipse cx="12" cy="7" rx="7" ry="3" />
      <path d="M5 7v10c0 1.7 3.1 3 7 3s7-1.3 7-3V7" />
      <path d="M5 11.8c0 1.7 3.1 3 7 3s7-1.3 7-3" />
    </>
  ),

  // A prism: one triangle, one seam.
  prisma: (
    <>
      <path d="M12 3.4 21.2 19.6H2.8Z" />
      <path d="M12 3.4v16.2" />
    </>
  ),

  // The two-part glyph, abstracted to two rounded blocks with an eye in each.
  python: (
    <>
      <rect x="3.8" y="3.8" width="9.4" height="9.4" rx="2.4" />
      <rect x="10.8" y="10.8" width="9.4" height="9.4" rx="2.4" />
      <circle cx="8.5" cy="8.5" r="0.95" />
      <circle cx="15.5" cy="15.5" r="0.95" />
    </>
  ),

  // Shield plus a numeral drawn in four segments: bar, stem, bar, bowl. The
  // numeral is the only reason this mark is not just a shield, and at 15px it
  // degrades to a shield rather than to a smudge.
  html5: (
    <>
      <path d={SHIELD} />
      <path d="M15.6 10.2h-5v3h4" />
      <path d="M14.4 13.2c1.7 0 2.6.9 2.6 2.3s-.9 2.3-2.6 2.3h-4" />
    </>
  ),

  javascript: (
    <>
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="3.2" />
      <path d="M12.6 8.8v4.9c0 1.4-1 2.3-2.4 2.3-.9 0-1.6-.4-2-1.1" />
      <path d="M18 10.2c-.5-.8-1.4-1.2-2.4-1.1-1 .1-1.7.8-1.7 1.7 0 1 .7 1.4 2.1 1.7 1.4.3 2.2.8 2.2 1.9 0 1-.8 1.7-1.9 1.8-1.1.1-2.1-.3-2.7-1.2" />
    </>
  ),

  // Same shield, so the two platform marks read as a pair.
  css3: (
    <>
      <path d={SHIELD} />
      <path d="M9.6 10.2h5.2" />
      <path d="M14.8 10.2c1.5 0 2.4.9 2.4 2.1 0 .8-.4 1.4-1.2 1.7.9.3 1.4 1 1.4 1.9 0 1.3-1 2.2-2.7 2.2H9.6" />
    </>
  ),

  // Leaf with a vein: Mongo's silhouette.
  mongodb: (
    <>
      <path d="M17.4 3.6c2.6 3.4 3 7.6.7 10.9-2 2.9-5.6 4.2-9 3.1 3.6-.6 6.2-3 6.8-6.6.5-3-.2-5.4-1.4-7.4Z" />
      <path d="M9.6 20.6c-1.1-1.6-1.1-3.2 0-4.8" />
    </>
  ),
};

export default function TechIcon({ name, size = 16, className, strokeWidth = 1.5 }: TechIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {MARKS[name]}
    </svg>
  );
}
