import type { Project } from "@/content/projects";

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
 * There is no screenshot to show -- nothing in `content/projects.ts` has a
 * thumbnail -- so this is a texture with the project's own primary icon in it.
 *
 * That swap is the point. This used to centre the title's first letter at 30px
 * in `--gray-300`, which made every card in the grid advertise the same
 * anonymous shape and pushed the card's real content two thirds of the way down
 * the card. The devicon of `project.stack[0]` is content the visitor can
 * actually recognise, it is already the first thing in the stack row below, and
 * it gives the six cards six different previews.
 *
 * `aria-hidden` throughout: the stack row beneath names every technology in
 * words, so the glyph announces nothing new.
 */
function Preview({ project }: { project: Project }) {
  const [primary] = project.stack;

  return (
    <div className="project-card-preview">
      <div className="halftone" style={{ opacity: 0.45 }} aria-hidden="true" />
      {primary ? (
        <i
          className={`${primary} relative text-4xl sm:text-5xl`}
          style={{ filter: "grayscale(0.55) contrast(0.95)" }}
          aria-hidden="true"
        />
      ) : null}
    </div>
  );
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
          {project.stack.map((icon: string) => (
            <i key={icon} className={icon} aria-hidden="true" />
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
