import { Link } from "react-router-dom";
import { PROJECTS } from "@/content/projects";
import ProjectCard from "@/components/projects/ProjectCard";

export default function Projects() {
  const preview = PROJECTS.slice(0, 4);

  return (
    <section id="projects" className="section-frame px-5 py-16 lg:px-6" style={{ fontFamily: "var(--font-mono)" }}>
      <div className="w-full max-w-4xl mx-auto">
        <p className="section-eyebrow mb-1">03 &mdash; projects</p>

        <h2 className="mb-2 text-xl sm:text-2xl font-semibold tracking-tight text-[var(--ink)]" style={{ fontFamily: "var(--font-display)" }}>
          projects
        </h2>

        {/* Section description -- prose, so Source Serif 4. */}
        <p
          className="mb-8 max-w-xl text-[15px] leading-[1.7]"
          style={{ fontFamily: "var(--font-serif)", color: "var(--gray-500)" }}
        >
          I&rsquo;m just getting started &mdash; here&rsquo;s what I&rsquo;m planning to build first.
        </p>

        <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2">
          {preview.map((project) => (
            <ProjectCard key={project.title} project={project} />
          ))}
        </div>

        <div className="mt-8 flex justify-center">
          <Link
            to="/projects"
            className="link-arrow group text-sm transition-colors hover:text-[var(--ink)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            view all projects{" "}
            <span className="arrow-glyph inline-block transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
              &#8599;
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
