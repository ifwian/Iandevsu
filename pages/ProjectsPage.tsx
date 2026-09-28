import { Link } from "react-router-dom";
import { PROJECTS } from "@/content/projects";
import type { Project } from "@/content/projects";
import ProjectCard from "@/components/projects/ProjectCard";

export default function ProjectsPage() {
  return (
    /**
     * `px-5 lg:px-6` rather than a flat `px-6`. This route is its own page shell
     * rather than a `.section-frame`, so nothing forced it to match -- and it
     * did not: 24px of gutter against the home sections' 20px below lg, for the
     * same `max-w-4xl` column. Same class string as the sections so the two
     * routes cannot drift again.
     */
    <div className="sidebar-offset min-h-screen px-5 py-16 lg:px-6" style={{ fontFamily: "var(--font-mono)" }}>
      <div className="w-full max-w-4xl mx-auto">
        <Link
          to="/"
          className="link-arrow group text-sm mb-8 inline-flex items-center transition-colors hover:text-white"
          style={{ fontFamily: "var(--font-display)" }}
        >
          <span className="arrow-glyph inline-block mr-1 transition-transform group-hover:-translate-x-0.5">
            &#8598;
          </span>{" "}
          back to home
        </Link>

        <p className="section-eyebrow">all projects</p>
        <h1 className="mb-2 text-3xl font-semibold tracking-tight text-white" style={{ fontFamily: "var(--font-display)" }}>
          projects
        </h1>
        <p
          className="mb-10 max-w-xl text-[15px] leading-[1.7]"
          style={{ fontFamily: "var(--font-serif)", color: "var(--gray-500)" }}
        >
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
