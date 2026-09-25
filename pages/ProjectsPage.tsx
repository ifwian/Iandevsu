import { Link } from "react-router-dom";
import { PROJECTS } from "@/content/projects";
import type { Project } from "@/content/projects";
import ProjectCard from "@/components/projects/ProjectCard";

export default function ProjectsPage() {
  return (
    <div className="min-h-screen px-6 py-16 lg:pl-80" style={{ fontFamily: "'Geist Mono', monospace" }}>
      <div className="max-w-4xl mx-auto">
        <Link
          to="/"
          className="link-arrow group text-sm mb-8 inline-flex items-center transition-colors hover:text-white"
          style={{ fontFamily: "'Kode Mono', monospace" }}
        >
          <span className="arrow-glyph inline-block mr-1 transition-transform group-hover:-translate-x-0.5">
            &#8598;
          </span>{" "}
          back to home
        </Link>

        <p className="section-eyebrow text-xs mb-1">all projects</p>
        <h1 className="mb-2 text-3xl font-semibold tracking-tight text-white" style={{ fontFamily: "'Kode Mono', monospace" }}>
          projects
        </h1>
        <p className="mb-10 max-w-[46ch] text-sm leading-relaxed" style={{ color: "var(--gray-500)" }}>
          Everything I&rsquo;m building or planning to build, real projects and practice templates alike.
        </p>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {PROJECTS.map((project: Project) => (
            <ProjectCard key={project.title} project={project} />
          ))}
        </div>
      </div>
    </div>
  );
}
