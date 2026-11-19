import { Link } from "react-router-dom";
import { PROJECTS } from "@/content/projects";
import ProjectCard from "@/components/projects/ProjectCard";

export default function Projects() {
  const preview = PROJECTS.slice(0, 4);

  return (
    <section id="projects" className="section-frame px-5 py-16 lg:px-6">
      <div className="w-full max-w-4xl mx-auto">
        <div className="section-shell">
          <div className="section-shell-bar">
            <p className="section-eyebrow">02 &mdash; projects</p>
          </div>

          {/* No `data-reveal-group`: this section has no entrance animation, so
              landing on it (the hero's "view projects", the sidebar) shows the
              cards immediately, already at the top of the screen. */}
          <div className="section-shell-body">
            <h2 className="section-title">projects</h2>

            <p className="section-lede">
              I&rsquo;m just getting started &mdash; here&rsquo;s what I&rsquo;m planning to build first.
            </p>

            <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2">
              {preview.map((project, index) => (
                <ProjectCard key={project.title} project={project} index={index} />
              ))}
            </div>

            <div className="mt-8 flex justify-center">
              <Link to="/projects" className="link-arrow">
                view all projects <span className="arrow-glyph">&#8599;</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
