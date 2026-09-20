import MainLayout from "@/components/layout/MainLayout";
import Hero from "@/components/sections/Hero";
import AboutMe from "@/components/sections/AboutMe";
import Projects from "@/components/sections/Projects";
import TechStackShowcase from "@/components/sections/TechStackShowcase";
import Education from "@/components/sections/Education";
import LifeOutsideIDE from "@/components/sections/LifeOutsideIDE";
import GithubActivity from "@/components/sections/GithubActivity";
import Blog from "@/components/sections/Blog";

export default function App() {
  return (
    <MainLayout>
      {/* Container spacing adjusted for smooth flow */}
      <div className="w-full max-w-4xl space-y-16">
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