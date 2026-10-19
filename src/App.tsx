import { Suspense, lazy, useEffect } from "react";
import "./dos/dos.css";
import { initDos } from "./dos/dos";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout";
import Hero from "@/components/sections/Hero";
import AboutMe from "@/components/sections/AboutMe";
import Projects from "@/components/sections/Projects";
import TechStackShowcase from "@/components/sections/TechStackShowcase";
import LifeOutsideIDE from "@/components/sections/LifeOutsideIDE";
import GithubActivity from "@/components/sections/GithubActivity";
import Blog from "@/components/sections/Blog";
import { useRevealOnScroll } from "@/lib/useRevealOnScroll";
import ChatWithIan from "@/components/chat/ChatWithIan";

const ProjectsPage = lazy(() => import("@/pages/ProjectsPage"));
const ChatInboxPage = lazy(() => import("@/pages/ChatInboxPage"));

function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, left: 0, behavior: reduced ? "auto" : "smooth" });
  }, [pathname, hash]);

  return null;
}

/**
 * The visitor's chat trigger and panel, on every page except the admin inbox.
 *
 * Both are `fixed` to the bottom-right corner, which on /chat-inbox is exactly
 * where the reply box puts its send button -- the pill sat over the lower half
 * of that button and took the clicks aimed at it. The admin is not a visitor
 * there either: the page they are on *is* the chat.
 */
function VisitorChat() {
  const { pathname } = useLocation();
  if (pathname === "/chat-inbox") return null;
  return <ChatWithIan />;
}

function Home() {
  /* Arms the scroll-entrance stagger for every section below the hero: the
     observer that puts `is-revealed` on each section body, plus the
     `reveal-ready` gate the hidden state lives behind. See
     `useRevealOnScroll` for why nothing is hidden without it. */
  useRevealOnScroll();

  return (
    <MainLayout>
      {/* No `space-y-*` here: every child is a section that centres its own
          content, so extra margin between them only adds dead gap between one
          section and the next.

          No max-width here on purpose. Every section carries its own
          `w-full max-w-4xl mx-auto` wrapper, so a cap on this element could
          never bind -- it just made the page look like it had two competing
          measures. `MainLayout` still caps the page as a whole, which is what
          keeps /chat-inbox inside 4xl. */}
      <div>
        <Hero />
        <AboutMe />
        <Projects />
        <TechStackShowcase />
        <LifeOutsideIDE />
        <GithubActivity />
        <Blog />
      </div>
    </MainLayout>
  );
}

export default function App() {
  useEffect(() => {
    const dos = initDos({
      containerSelector: "main",
      corner: "bottom-left",
      zIndex: 45,
    });
    return () => dos.destroy();
  }, []);

  return (
    <BrowserRouter>
      {/* Inside the router: it reads the location, so it has to be a descendant
          of whichever router is in play. */}
      <ScrollToTop />
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/chat-inbox" element={<ChatInboxPage />} />
        </Routes>
      </Suspense>
      {/* The chat trigger and its panel are both `fixed`, so this is mounted
          beside the routes rather than inside one: it stays reachable from every
          page instead of only the ones whose layout happens to include it, and it
          cannot inherit a route's `overflow` or stacking context and be clipped
          by it. */}
      <VisitorChat />
    </BrowserRouter>
  );
}