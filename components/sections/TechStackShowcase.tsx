"use client";

import { useEffect, useState } from "react";

interface StackItem {
  name: string;
  icon?: string;
  category: "frontend" | "backend" | "tools";
}

// Curated peek selection
const PEEK_STACK: StackItem[] = [
  { name: "HTML5", icon: "devicon-html5-plain colored", category: "frontend" },
  { name: "CSS3", icon: "devicon-css3-plain colored", category: "frontend" },
  { name: "JavaScript", icon: "devicon-javascript-plain colored", category: "frontend" },
  { name: "React", icon: "devicon-react-original colored", category: "frontend" },
  { name: "Tailwind CSS", icon: "devicon-tailwindcss-original colored", category: "frontend" },
  { name: "Git", icon: "devicon-git-plain colored", category: "tools" },
  { name: "GitHub", icon: "devicon-github-original", category: "tools" },
];

// Full categorized dataset
const FULL_STACK_DATA: { categoryLabel: string; items: StackItem[] }[] = [
  {
    categoryLabel: "FRONTEND",
    items: [
      { name: "HTML5", icon: "devicon-html5-plain colored", category: "frontend" },
      { name: "CSS3", icon: "devicon-css3-plain colored", category: "frontend" },
      { name: "JavaScript", icon: "devicon-javascript-plain colored", category: "frontend" },
      { name: "React", icon: "devicon-react-original colored", category: "frontend" },
      { name: "Tailwind CSS", icon: "devicon-tailwindcss-original colored", category: "frontend" },
    ],
  },
  {
    categoryLabel: "BACKEND",
    items: [
      { name: "Node.js", icon: "devicon-nodejs-plain colored", category: "backend" },
      { name: "Express.js", icon: "devicon-express-original colored", category: "backend" },
      { name: "Python", icon: "devicon-python-plain colored", category: "backend" },
      { name: "Java", icon: "devicon-java-plain colored", category: "backend" },
      { name: "PostgreSQL", icon: "devicon-postgresql-plain colored", category: "backend" },
      { name: "MySQL", icon: "devicon-mysql-plain colored", category: "backend" },
      { name: "Prisma", icon: "devicon-prisma-original colored", category: "backend" },
    ],
  },
  {
    categoryLabel: "TOOLS & DEVOPS",
    items: [
      { name: "Git", icon: "devicon-git-plain colored", category: "tools" },
{ name: "GitHub", icon: "devicon-github-original", category: "tools" },
      { name: "Figma", icon: "devicon-figma-plain colored", category: "tools" },
      { name: "VS Code", icon: "devicon-vscode-plain colored", category: "tools" },
    ],
  },
];

export default function TechStackShowcase() {
  const [showAll, setShowAll] = useState(false);

  // Dynamic Google Font Injection
  useEffect(() => {
    const linkKode = document.createElement("link");
    linkKode.href = "https://fonts.googleapis.com/css2?family=Kode+Mono:wght@400..700&display=swap";
    linkKode.rel = "stylesheet";
    document.head.appendChild(linkKode);

    const linkGeist = document.createElement("link");
    linkGeist.href = "https://fonts.googleapis.com/css2?family=Geist+Mono:wght@100..900&display=swap";
    linkGeist.rel = "stylesheet";
    document.head.appendChild(linkGeist);
  }, []);

  return (
    <section 
      id="stack" 
      className="snap-start px-5 py-16 lg:px-6 lg:pl-56"
      style={{ fontFamily: "'Geist Mono', monospace" }}
    >
      <div className="w-full max-w-4xl mx-auto">
        {/* Eyebrow Header + View All Stack Toggle Link */}
        <div className="mb-1.5 flex items-baseline justify-between">
          <p 
            className="section-eyebrow text-xs sm:text-sm font-medium text-[var(--gray-400)] mb-0 tracking-wider"
            style={{ fontFamily: "'Geist Mono', monospace" }}
          >
            04 &mdash; stack
          </p>

          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="group text-xs transition-colors text-[var(--gray-500)] hover:text-[var(--ink)] cursor-pointer bg-transparent border-none p-0 flex items-center gap-1"
            style={{ fontFamily: "'Kode Mono', monospace" }}
          >
            <span>{showAll ? "show peek" : "view all stack"}</span>
            <span className={`inline-block transition-transform duration-200 ${showAll ? "rotate-45" : "group-hover:-translate-y-0.5 group-hover:translate-x-0.5"}`}>
              &#8599;
            </span>
          </button>
        </div>

        {/* Heading in Kode Mono */}
        <h2 
          className="mb-2 text-xl sm:text-2xl font-bold tracking-tight text-[var(--ink)] leading-tight"
          style={{ fontFamily: "'Kode Mono', monospace" }}
        >
          tech stack
        </h2>

        {/* Subtitle in Geist Mono */}
        <p className="mb-6 max-w-xl text-xs sm:text-sm leading-relaxed text-[var(--gray-500)]">
          The tools, frameworks, and platforms I reach for across my projects.
        </p>

        {showAll ? (
          /* ================= EXPANDED CATEGORIZED VIEW ================= */
          <div className="space-y-4">
            {FULL_STACK_DATA.map((group) => (
              <div key={group.categoryLabel}>
                <p 
                  className="micro-label mb-2 text-[10px] font-medium uppercase tracking-wider text-[var(--gray-400)]"
                  style={{ fontFamily: "'Kode Mono', monospace" }}
                >
                  {group.categoryLabel}
                </p>
                <div className="flex flex-wrap gap-2">
                  {group.items.map((item) => (
                    <div
                      key={item.name}
                      className="card flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[var(--gray-50)] border border-[var(--gray-200)] text-[var(--gray-200)] transition-all duration-200 hover:border-[var(--gray-300)] hover:bg-[var(--gray-100)] hover:text-[var(--ink)] cursor-default"
                      style={{ fontFamily: "'Kode Mono', monospace" }}
                    >
                      {item.icon && <i className={`${item.icon} text-sm`} aria-hidden="true" />}
                      <span className="text-xs font-medium">{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* ================= CURATED PEEK VIEW ================= */
          <div className="flex flex-wrap gap-2">
            {PEEK_STACK.map((item) => (
              <div
                key={item.name}
                className="card flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[var(--gray-50)] border border-[var(--gray-200)] text-[var(--gray-200)] transition-all duration-200 hover:border-[var(--gray-300)] hover:bg-[var(--gray-100)] hover:text-[var(--ink)] cursor-default"
                style={{ fontFamily: "'Kode Mono', monospace" }}
              >
                {item.icon && <i className={`${item.icon} text-sm`} aria-hidden="true" />}
                <span className="text-xs font-medium">{item.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}