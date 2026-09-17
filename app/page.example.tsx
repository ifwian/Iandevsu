import Sidebar from "@/components/layout/Sidebar";
import Footer from "@/components/layout/Footer";
import ScrollTopButton from "@/components/layout/ScrollTopButton";
import Hero from "@/components/sections/Hero";
import TechStackShowcase from "@/components/sections/TechStackShowcase";
import Education from "@/components/sections/Education";
import GithubActivity from "@/components/sections/GithubActivity";
import Projects from "@/components/sections/Projects";
import Blog from "@/components/sections/Blog";
import LifeOutsideIDE from "@/components/sections/LifeOutsideIDE";
import Contact from "@/components/sections/Contact";

// Full composition. TechStackShowcase supersedes the old standalone
// "Skills" section (its content is folded in), so it's intentionally
// not re-added here -- see the README for why.

export default function Home() {
  return (
    <>
      <Sidebar />

      <main>
        <Hero />
        <TechStackShowcase />
        <Education />
        <GithubActivity />
        <Projects />
        <Blog />
        <LifeOutsideIDE />
        <Contact />
      </main>

      <Footer />
      <ScrollTopButton />
    </>
  );
}
