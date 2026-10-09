import type { CSSProperties } from "react";
import type { Project } from "@/content/projects";
import TechIcon from "@/components/icons/TechIcon";

/**
 * The preview for a project that has no screenshot yet.
 *
 * It is "connected" to the project in two ways: the big faint mark is the
 * project's own first stack icon, and the card path / title above it are the
 * project's. On top of that sits Dos with a speech bubble, and a progress bar.
 *
 * Dos's pose follows the project's tone, so a grid of these does not look like
 * one picture repeated:
 *   active   -- scratching away (being built right now)
 *   template -- napping (a practice exercise, nobody is waiting on it)
 *   live     -- sitting up (built, waiting to ship)
 *
 * The bar is segmented like an old DOS loader. With `project.progress` set it
 * shows that percentage; without it, it shows an animated "in progress" sweep
 * rather than inventing a number.
 */

const SEGMENTS = 20;

type Pose = "scratch" | "sleep" | "idle";

const POSE_BY_TONE: Record<NonNullable<Project["tone"]>, Pose> = {
  active: "scratch",
  template: "sleep",
  live: "idle",
};

export default function BuildingPreview({ project }: { project: Project }) {
  const [primary] = project.stack;
  const pose = POSE_BY_TONE[project.tone ?? "active"];
  const known = typeof project.progress === "number";
  const pct = known ? Math.min(100, Math.max(0, Math.round(project.progress as number))) : 0;
  const lit = Math.round((pct / 100) * SEGMENTS);
  const note = project.buildNote ?? "still building";

  return (
    <div className="project-card-preview building-preview" data-pose={pose}>
      <div className="halftone" style={{ opacity: 0.35 }} aria-hidden="true" />

      {primary ? (
        <TechIcon name={primary} size={72} strokeWidth={1} className="building-mark" />
      ) : null}

      {/* Decorative: the progress bar below carries the information. */}
      <div className="building-scene" aria-hidden="true">
        <span className="building-dos" />
        <span className="building-bubble">
          {note}
          <span className="building-dots" />
        </span>
      </div>

      <div
        className="building-progress"
        role="progressbar"
        aria-label={`${project.title} build progress`}
        {...(known ? { "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": pct } : {})}
      >
        <span className="building-progress-label">building</span>
        <span className="building-track" data-indeterminate={known ? undefined : "true"} aria-hidden="true">
          {Array.from({ length: SEGMENTS }, (_, i) => (
            <span
              key={i}
              className="building-seg"
              data-on={known && i < lit ? "true" : undefined}
              style={{ "--i": i } as CSSProperties}
            />
          ))}
        </span>
        <span className="building-progress-value">{known ? `${pct}%` : "--"}</span>
      </div>
    </div>
  );
}
