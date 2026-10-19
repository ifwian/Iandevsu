import type { ReactNode } from "react";

/**
 * Monochrome outline marks for every technology the site names by name: the
 * stack rows on the project cards (`content/projects.ts`) and the full list the
 * 04 stack section shows.
 *
 * These replace the Devicon glyphs both of those places used to render. Devicon
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
 * One optical weight across all sixteen is the point of hand-authoring them: an
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
  | "mongodb"
  | "git"
  | "java"
  | "mysql"
  | "figma"
  | "vscode";

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

  // Two commits on a trunk and a third branched off it. Three circles and two
  // rules is the whole graph, which is why this one is drawn rather than
  // abstracted: there is nothing to abstract.
  git: (
    <>
      <circle cx="6.5" cy="7" r="2.3" />
      <circle cx="6.5" cy="17" r="2.3" />
      <circle cx="17.5" cy="12" r="2.3" />
      <path d="M6.5 9.3v5.4" />
      <path d="M8.8 7h5.4a3.3 3.3 0 0 1 3.3 3.3v0.5" />
    </>
  ),

  // The language is named after an island's coffee and has carried a steaming
  // cup as its mark ever since. Drawn as a tapered mug, a handle and two
  // wisps: at 15px the cup is the part that survives, and the wisps are what
  // keep it from reading as a bin.
  java: (
    <>
      <path d="M7 10.6h8.2l-.75 6.7a2 2 0 0 1-2 1.75h-2.7a2 2 0 0 1-2-1.75Z" />
      <path d="M15.2 12.3h1.4a2.15 2.15 0 0 1 0 4.3h-1.8" />
      <path d="M9.8 3.8c1.2 1 1.2 2 0 3" />
      <path d="M13 4.8c1.2 1 1.2 2 0 3" />
    </>
  ),

  // MySQL's mark is a dolphin, and a traced dolphin at this size is a blob --
  // so it is reduced to the parts that identify it: a rounded body, the dorsal
  // fin, the fluke, one eye. The same trade the Postgres note above describes,
  // on a shape that at least keeps an outline.
  mysql: (
    <>
      <path d="M5.8 12.4c0-2.8 2.9-5 6.1-5s6.1 2.2 6.1 5-2.7 5-6.1 5-6.1-2.2-6.1-5Z" />
      <path d="M5.8 12.4 3 9.9v5Z" />
      <path d="M11.2 7.6 12.6 4.4l1.9 3.3" />
      <circle cx="15" cy="11.2" r="0.85" />
    </>
  ),

  // The one brand mark here whose geometry is simple enough to reproduce
  // rather than abstract: three half-rounds down the left, the disc on the
  // middle right, the quarter-round foot.
  figma: (
    <>
      <path d="M12 3.2H9.6a3.2 3.2 0 0 0 0 6.4H12z" />
      <path d="M12 3.2h2.4a3.2 3.2 0 0 1 0 6.4H12z" />
      <path d="M12 9.6H9.6a3.2 3.2 0 0 0 0 6.4H12z" />
      <path d="M14.4 9.6a3.2 3.2 0 1 1 0 6.4 3.2 3.2 0 0 1 0-6.4z" />
      <path d="M12 16H9.6a3.2 3.2 0 1 0 2.4 5.4z" />
    </>
  ),

  // VS Code's mark is a folded ribbon: a filled shape with two cut corners,
  // which as an outline is a bowtie. So this is the honest fallback -- the
  // brackets and bar of an editor -- sitting beside the words the chip
  // already prints.
  vscode: (
    <>
      <path d="M9.4 7.6 5 12l4.4 4.4" />
      <path d="M14.6 7.6 19 12l-4.4 4.4" />
      <path d="M13.4 5.2 10.6 18.8" />
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
