import { Link } from "react-router-dom";
import { PROJECTS } from "@/content/projects";
import type { Project } from "@/content/projects";
import ProjectCard from "@/components/projects/ProjectCard";

export default function ProjectsPage() {
  const live = PROJECTS.filter((p: Project) => p.tone === "live").length;
  const building = PROJECTS.filter((p: Project) => p.tone === "active").length;

  return (
    /**
     * `px-5 lg:px-6` rather than a flat `px-6`. This route is its own page shell
     * rather than a `.section-frame`, so nothing forced it to match -- and it
     * did not: 24px of gutter against the home sections' 20px below lg, for the
     * same `max-w-4xl` column. Same class string as the sections so the two
     * routes cannot drift again.
     *
     * `pt-24` rather than `py-16`: this is a second route, so it is a fresh
     * page load and the fixed mobile top bar is over the content again. The
     * home sections can start at their own `py-16` because they are mid-document;
     * 64px of top padding under a 68px bar put this page's own title bar against
     * the navigation. `pb-16` keeps the bottom edge where it was.
     */
    <main
      id="main-content"
      tabIndex={-1}
      className="sidebar-offset min-h-screen px-5 pb-16 pt-24 lg:px-6 lg:py-16"
      style={{ fontFamily: "var(--font-mono)" }}
    >
      <div className="w-full max-w-4xl mx-auto">
        <Link
          to="/"
          className="link-arrow group mb-6 inline-flex items-center text-sm transition-colors hover:text-[var(--ink)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {/* `hover:text-white` was on this link, and it was invisible in light
              mode -- white on a white page. `--ink` is what every other
              `.link-arrow` call site on the site uses. */}
          <span className="arrow-glyph mr-1 inline-block transition-transform group-hover:-translate-x-0.5">
            &#8598;
          </span>
          back to home
        </Link>

        {/* The same window every home section sits in, for the same reason: the
            route was the one place on the site showing bare content on a bare
            page, so it read as unfinished next to a home page made of windows.
            Same `.section-shell` + bar + scanlines + body trio, so there is now
            nothing on this page that the home page does not also use. */}
        <div className="section-shell">
          <div className="section-shell-bar">
            <p className="section-eyebrow">all projects</p>

            {/* The bar's right-hand slot, the same one the 04 and 07 sections use
                for their controls. A count is the one thing worth saying here:
                the grid below mixes shipped work with practice templates, and
                the number of each is the first question a visitor has. */}
            <span className="section-shell-action" style={{ cursor: "default" }}>
              {live} live &middot; {building} building &middot; {PROJECTS.length} total
            </span>
          </div>

          <div className="scanlines" aria-hidden="true" />

          <div className="section-shell-body">
            {/* `section-title` even though this is an `<h1>`. The class is a type
                scale, not a heading-level rule, and reusing it is what keeps this
                page's title on the same size as every section title on the home
                page -- the same reasoning `.section-title` gives about the seven
                sections that had drifted into four different sizes.

                It is an h1 on purpose: this is a page, and the home page's h1 is
                the name in the hero, so `/projects` needs its own. */}
            <h1 className="section-title title-row mb-1">
              <span>projects</span>
              <span className="title-cursor" aria-hidden="true" />
            </h1>

            <p
              className="mb-8 max-w-xl text-[15px] leading-[1.75] sm:text-[17px]"
              style={{ fontFamily: "var(--font-serif)", color: "var(--gray-400)" }}
            >
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
    </main>
  );
}
