import type { Project } from "@/content/projects";

function PreviewFrame({ title }: { title: string }) {
  return (
    <div
      className="relative flex aspect-video items-center justify-center overflow-hidden rounded-t-2xl border-b"
      style={{ backgroundColor: "var(--gray-100, rgba(255, 255, 255, 0.05))", borderColor: "var(--gray-200, rgba(255, 255, 255, 0.1))" }}
    >
      <div className="absolute left-3 top-3 flex gap-1.5" aria-hidden="true">
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "var(--gray-300, rgba(255, 255, 255, 0.3))" }} />
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "var(--gray-300, rgba(255, 255, 255, 0.3))" }} />
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "var(--gray-300, rgba(255, 255, 255, 0.3))" }} />
      </div>
      <div className="halftone" style={{ opacity: 0.5 }} aria-hidden="true" />
      <span
        className="relative text-4xl"
        style={{ fontFamily: "'Kode Mono', monospace", color: "var(--gray-300, rgba(255, 255, 255, 0.3))" }}
        aria-hidden="true"
      >
        {title.charAt(0)}
      </span>
    </div>
  );
}

export default function ProjectCard({ project }: { project: Project }) {
  return (
    <div className="card flex flex-col overflow-hidden p-0 rounded-xl bg-[var(--gray-50)] border border-[var(--gray-200)]">
      <PreviewFrame title={project.title} />

      <div className="flex flex-1 flex-col justify-between p-5">
        <div>
          <div className="mb-1 flex items-center justify-between gap-2">
            <h3 className="text-base font-semibold text-[var(--ink)] tracking-tight" style={{ fontFamily: "'Kode Mono', monospace" }}>
              {project.title}
            </h3>

            {project.status && (
              <span
                className="pill shrink-0 text-[10px] uppercase tracking-widest px-2 py-0.5 rounded border border-[var(--gray-200)] bg-[var(--gray-100)] text-[var(--gray-400)]"
                style={{ fontFamily: "'Kode Mono', monospace" }}
              >
                {project.status}
              </span>
            )}
          </div>

          <p className="mb-2.5 text-xs" style={{ color: "var(--gray-400)" }}>
            {project.role}
          </p>

          <p className="mb-4 text-sm leading-relaxed" style={{ color: "var(--gray-500)", lineHeight: 1.65 }}>
            {project.description}
          </p>

          <div className="mb-4 flex flex-wrap gap-2">
            {project.stack.map((icon: string) => (
              <i key={icon} className={`${icon} text-base`} aria-hidden="true" />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end pt-3" style={{ borderTop: "1px solid var(--gray-200)" }}>
          {project.href ? (
            <a
              href={project.href}
              target="_blank"
              rel="noopener noreferrer"
              className="link-arrow group text-xs transition-colors hover:text-[var(--ink)]"
              style={{ fontFamily: "'Kode Mono', monospace" }}
            >
              visit site{" "}
              <span className="arrow-glyph inline-block transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
                &#8599;
              </span>
            </a>
          ) : (
            <span className="micro-label text-[10px] uppercase tracking-widest text-[var(--gray-400)]" style={{ fontFamily: "'Kode Mono', monospace" }}>
              not live yet
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
