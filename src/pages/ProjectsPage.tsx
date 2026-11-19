import { Link } from "react-router-dom";
import { PROJECTS } from "@/content/projects";
import type { Project } from "@/content/projects";
import ProjectCard from "@/components/projects/ProjectCard";
import MainLayout from "@/components/layout/MainLayout";

/**
 * /projects: every project, in the same window the home sections use.
 *
 * It renders inside `MainLayout` like the home page, so the sidebar (or the
 * mobile bar) is present and the content is centred in the space beside it. It
 * used to be a bare `<main>` that still reserved the sidebar's width as left
 * padding with no sidebar in it -- an empty gutter on the left and content
 * pushed off-centre.
 *
 * No entrance animation: the grid is on screen from the first frame.
 */
export default function ProjectsPage() {
  const live = PROJECTS.filter((p: Project) => p.tone === "live").length;
  const building = PROJECTS.filter((p: Project) => p.tone === "active").length;

  return (
    <MainLayout>
      <div className="section-frame px-5 pt-6 pb-16 lg:px-6 lg:pt-0">
        <div className="w-full max-w-4xl mx-auto">
          <Link to="/" className="link-arrow mb-6 flex w-fit">
            <span className="arrow-glyph arrow-glyph-back">&#8598;</span>
            back to home
          </Link>

          <div className="section-shell">
            <div className="section-shell-bar">
              <p className="section-eyebrow">all projects</p>

              {/* A count is the one thing worth saying here: the grid mixes
                  shipped work with work in progress. */}
              <span className="section-shell-action" style={{ cursor: "default" }}>
                {live} live &middot; {building} building &middot; {PROJECTS.length} total
              </span>
            </div>

            <div className="section-shell-body">
              {/* An h1: this is a page, and the home page's h1 is the name. */}
              <h1 className="section-title title-row mb-1">
                <span>projects</span>
                <span className="title-cursor" aria-hidden="true" />
              </h1>

              <p className="section-lede">
                Everything I&rsquo;m building or planning to build, real projects and practice templates
                alike.
              </p>

              <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2">
                {PROJECTS.map((project: Project, i: number) => (
                  <ProjectCard key={project.title} project={project} index={i} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
