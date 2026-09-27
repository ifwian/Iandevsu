import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout";
import Hero from "@/components/sections/Hero";
import AboutMe from "@/components/sections/AboutMe";
import Projects from "@/components/sections/Projects";
import TechStackShowcase from "@/components/sections/TechStackShowcase";
import Education from "@/components/sections/Education";
import LifeOutsideIDE from "@/components/sections/LifeOutsideIDE";
import GithubActivity from "@/components/sections/GithubActivity";
import Blog from "@/components/sections/Blog";
import ProjectsPage from "@/pages/ProjectsPage";
import ChatInboxPage from "@/pages/ChatInboxPage";

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
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/chat-inbox" element={<ChatInboxPage />} />
      </Routes>
    </BrowserRouter>
  );
}
