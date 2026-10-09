import type { Project } from "@/content/projects";
import TechIcon from "@/components/icons/TechIcon";
import BuildingPreview from "@/components/projects/BuildingPreview";
import "./project-preview.css";

interface ProjectCardProps {
  project: Project;
  /**
   * Zero-based position, rendered as a `01` / `02` gutter marker in the card's
   * title bar. Optional because it is presentational -- a card with no index
   * simply omits the marker rather than reading "NaN".
   */
  index?: number;
}

/**
 * The preview area.
 *
 * A project with a screenshot (`project.image`) shows it. A project without one
 * shows the "still building" scene instead (`BuildingPreview`): the project's
 * own mark, Dos with a speech bubble, and a progress bar. Either way the area is
 * the same 16:9 box, so a grid mixing both stays aligned.
 *
 * The screenshot is decorative next to the title, but it is also the only thing
 * that shows what the project looks like, so it keeps real alt text.
 */
function Preview({ project }: { project: Project }) {
  if (project.image) {
    return (
      <div className="project-card-preview">
        <img
          className="project-card-shot"
          src={project.image.src}
          alt={project.image.alt}
          width={1200}
          height={675}
          loading="lazy"
          decoding="async"
        />
      </div>
    );
  }
  return <BuildingPreview project={project} />;
}

export default function ProjectCard({ project, index }: ProjectCardProps) {
  return (
    /* `.card` is kept for the resting/hover pair: it is the site's one shared
       "light up slightly" treatment (border warms, ink ring appears, a small
       lift), and it is what makes these cards read as the same objects as every
       other bordered surface on the page. Everything else here is new. */
    <article className="card project-card">
      {/* The card's own window chrome, so a card reads as a terminal window
          rather than as a bordered box. Same bar treatment as
          `.section-shell-bar` and `.build-panel-bar`: hairline, `--gray-100`,
          trio of dots. */}
      <div className="project-card-bar">
        <span className="flex shrink-0 items-center gap-1" aria-hidden="true">
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "var(--gray-300)" }} />
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "var(--gray-300)" }} />
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "var(--gray-300)" }} />
        </span>
        {typeof index === "number" ? (
          <span className="project-card-index" aria-hidden="true">
            {String(index + 1).padStart(2, "0")}
          </span>
        ) : null}
        <span className="project-card-path">
          projects/{project.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}
        </span>
      </div>

      <Preview project={project} />

      <div className="project-card-body">
        {/* Title and status share a row. `flex-wrap` so that a long title and a
            tag cannot overflow: the title has `min-width: 0` from
            `.project-card-title`, so it wraps its text while the tag, which is
            `flex: none`, never shrinks. */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="project-card-title">{project.title}</h3>

          {project.status ? (
            /* `.pill` with a single `data-tone`, so the three visual weights
               live in one rule (`.project-tag`) instead of a pile of utilities
               re-stating what `.pill` already sets -- and fighting it on six
               axes. See the `.project-tag` comment in theme.css. */
            <span
              className="pill project-tag"
              data-tone={project.tone}
            >
              {project.status}
            </span>
          ) : null}
        </div>

        <p className="project-card-role">{project.role}</p>
        <p className="project-card-summary">{project.description}</p>

        <div className="project-card-stack">
          {project.stack.map((icon, index) => (
            /* Keyed by position within the card. The name alone is not unique --
               a project can list the same technology twice -- and the list is
               static, so the index is stable here and does not remount. */
            <TechIcon key={`${project.title}-${index}`} name={icon} size={15} strokeWidth={1.6} />
          ))}
        </div>

        <div className="project-card-foot">
          {project.href ? (
            <a
              href={project.href}
              target="_blank"
              rel="noopener noreferrer"
              className="link-arrow group text-xs transition-colors hover:text-[var(--ink)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              visit site{" "}
              <span className="arrow-glyph inline-block transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
                &#8599;
              </span>
            </a>
          ) : (
            <span className="micro-label">no live url yet</span>
          )}
        </div>
      </div>
    </article>
  );
}
