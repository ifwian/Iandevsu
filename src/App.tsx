import { Suspense, lazy, useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout";
import Hero from "@/components/sections/Hero";
import AboutMe from "@/components/sections/AboutMe";
import Projects from "@/components/sections/Projects";
import TechStackShowcase from "@/components/sections/TechStackShowcase";
import Education from "@/components/sections/Education";
import LifeOutsideIDE from "@/components/sections/LifeOutsideIDE";
import GithubActivity from "@/components/sections/GithubActivity";
import Blog from "@/components/sections/Blog";

const ProjectsPage = lazy(() => import("@/pages/ProjectsPage"));
const ChatInboxPage = lazy(() => import("@/pages/ChatInboxPage"));

/**
 * Sends the window back to the top on every route change.
 *
 * React Router does not touch scroll position itself, so the scroll offset
 * simply carries across a navigation. That is what made "view all projects"
 * land the visitor in the middle of the index: the link sits at the bottom of
 * the 03 PROJECTS section, and /projects is roughly the same height, so the
 * browser kept the offset and dropped them near the bottom of a page they had
 * not seen the top of yet.
 *
 * It lives here, keyed on `pathname`, rather than as an `onClick` on that one
 * link, because the same bug runs the other way: "back to home" from the foot
 * of a long /projects page would otherwise restore the home page's scroll
 * offset from before, which is a position that no longer exists. One rule at
 * the router covers every route it has and every route added later.
 *
 * `behavior: "auto"` under reduced motion is not a hardcoded instant jump --
 * per CSSOM-View `auto` defers to the `scroll-behavior` property, and
 * theme.css's reduced-motion block already sets `scroll-behavior: auto` on
 * `html`. Passing a literal `"smooth"` instead would override a media query the
 * visitor has no way to reach past, which is the same trap `MainLayout`'s
 * `jumpTo` deliberately steps around.
 *
 * The `hash` guard: an in-page anchor jump (the sidebar links, the command
 * palette) is a navigation too, and scrolling to 0 would yank the visitor back
 * off the section they just asked for. `MainLayout.jumpTo` scrolls the target
 * into view itself, so skipping here is what leaves that working.
 */
function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, left: 0, behavior: reduced ? "auto" : "smooth" });
  }, [pathname, hash]);

  return null;
}

function Home() {
  return (
    <MainLayout>
      {/* No `space-y-*` here: every child is a min-h-screen section that
          centres its own content, so extra margin between them only adds dead
          gap and throws off the scroll-snap positions. `.snap-sections` is the
          hook theme.css uses to enable snapping on this page alone.

          No max-width here on purpose. Every section carries its own
          `w-full max-w-4xl mx-auto` wrapper, so a cap on this element could
          never bind -- it just made the page look like it had two competing
          measures. `MainLayout` still caps the page as a whole, which is what
          keeps /chat-inbox inside 4xl. */}
      <div className="snap-sections">
        <Hero />
        <AboutMe />
        <Projects />
        <TechStackShowcase />
        <Education />
        <LifeOutsideIDE />
        <GithubActivity />
        <Blog />
      </div>
    </MainLayout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      {/* Inside the router: it reads the location, so it has to be a descendant
          of whichever router is in play. */}
      <ScrollToTop />
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/chat-inbox" element={<ChatInboxPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
