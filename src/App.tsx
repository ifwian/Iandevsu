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
      {/* Changed max-w-2xl to max-w-4xl for a wider layout */}
      <div className="w-full max-w-4xl space-y-16">
        <section id="home"><Hero /></section>
        <section id="about"><AboutMe /></section>
        <section id="projects"><Projects /></section>
        <section id="stack"><TechStackShowcase /></section>
        <section id="education"><Education /></section>
        <section id="life"><LifeOutsideIDE /></section>
        <section id="github"><GithubActivity /></section>
        <section id="blog"><Blog /></section>
      </div>
    </MainLayout>
  );
}