import { SIMPLE_ICON_PATHS, type SimpleIconName } from "./simpleIconPaths";

/**
 * Monochrome technology marks.
 *
 * Brand marks are Simple Icons (CC0) path data, inlined in `simpleIconPaths.ts`
 * and filled with `currentColor`, so every mark takes the text colour of the
 * element it sits in: gray at rest, ink on hover, never a brand colour.
 *
 * VS Code is the one mark Simple Icons no longer ships (trademark removal), so
 * it keeps a small Lucide-style outline glyph -- the editor's own brackets.
 *
 * `aria-hidden` always: every call site prints the technology's name next to
 * the mark or sits on a card whose text already says it.
 */

export type TechIconName = SimpleIconName | "vscode";

/** Display labels, shared by the project cards and the stack section. */
export const TECH_LABELS: Record<TechIconName, string> = {
  react: "React",
  tailwindcss: "Tailwind CSS",
  nodejs: "Node.js",
  express: "Express",
  postgresql: "PostgreSQL",
  prisma: "Prisma",
  python: "Python",
  html5: "HTML5",
  javascript: "JavaScript",
  css3: "CSS3",
  mongodb: "MongoDB",
  git: "Git",
  java: "Java",
  mysql: "MySQL",
  figma: "Figma",
  vscode: "VS Code",
};

interface TechIconProps {
  name: TechIconName;
  /** Rendered width and height in px. */
  size?: number;
  className?: string;
  /** Only used by the outline fallback (VS Code); brand marks are filled. */
  strokeWidth?: number;
}

export default function TechIcon({ name, size = 16, className, strokeWidth = 1.6 }: TechIconProps) {
  if (name === "vscode") {
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
        <path d="M9.4 7.6 5 12l4.4 4.4" />
        <path d="M14.6 7.6 19 12l-4.4 4.4" />
        <path d="M13.4 5.2 10.6 18.8" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d={SIMPLE_ICON_PATHS[name]} />
    </svg>
  );
}
