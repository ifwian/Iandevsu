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
      <div className="w-full max-w-4xl mx-auto space-y-16">
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
