"use client";

import { useState } from "react";

interface StackItem {
  name: string;
  icon?: string;
  category: "frontend" | "backend" | "tools";
}

const PEEK_STACK: StackItem[] = [
  { name: "HTML5", icon: "devicon-html5-plain colored", category: "frontend" },
  { name: "CSS3", icon: "devicon-css3-plain colored", category: "frontend" },
  { name: "JavaScript", icon: "devicon-javascript-plain colored", category: "frontend" },
  { name: "React", icon: "devicon-react-original colored", category: "frontend" },
  { name: "Tailwind CSS", icon: "devicon-tailwindcss-original colored", category: "frontend" },
  { name: "Git", icon: "devicon-git-plain colored", category: "tools" },
  { name: "GitHub", icon: "devicon-github-original", category: "tools" },
];

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


  return (
    <section 
      id="stack" 
      className="section-frame px-5 py-16 lg:px-6"
      style={{ fontFamily: "var(--font-mono)" }}
    >
      <div className="w-full max-w-4xl mx-auto">
        <div className="mb-1.5 flex items-baseline justify-between">
          <p 
            className="section-eyebrow font-medium mb-0 tracking-wider"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            04 &mdash; stack
          </p>

          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="group text-xs transition-colors text-[var(--gray-500)] hover:text-[var(--ink)] cursor-pointer bg-transparent border-none p-0 flex items-center gap-1"
            style={{ fontFamily: "var(--font-display)" }}
          >
            <span>{showAll ? "show peek" : "view all stack"}</span>
            <span className={`inline-block transition-transform duration-200 ${showAll ? "rotate-45" : "group-hover:-translate-y-0.5 group-hover:translate-x-0.5"}`}>
              &#8599;
            </span>
          </button>
        </div>

        <h2 
          className="mb-2 text-xl sm:text-2xl font-bold tracking-tight text-[var(--ink)] leading-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          tech stack
        </h2>

        {/* Section description -- prose, so Source Serif 4. */}
        <p
          className="mb-6 max-w-xl text-[15px] leading-[1.7] text-[var(--gray-500)]"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          The tools, frameworks, and platforms I reach for across my projects.
        </p>

        {showAll ? (
          <div className="space-y-4">
            {FULL_STACK_DATA.map((group) => (
              <div key={group.categoryLabel}>
                <p 
                  className="micro-label mb-2 text-[11px] font-medium uppercase tracking-wider text-[var(--gray-500)]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {group.categoryLabel}
                </p>
                <div className="flex flex-wrap gap-2">
                  {group.items.map((item) => (
                    <div
                      key={item.name}
                      className="card flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[var(--gray-50)] border border-[var(--gray-200)] text-[var(--ink)] transition-all duration-200 hover:border-[var(--gray-300)] hover:bg-[var(--gray-100)] cursor-default"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {item.icon && <i className={`${item.icon} text-sm`} aria-hidden="true" />}
                      <span className="text-xs font-medium text-[var(--ink)]">{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {PEEK_STACK.map((item) => (
              <div
                key={item.name}
                className="card flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[var(--gray-50)] border border-[var(--gray-200)] text-[var(--ink)] transition-all duration-200 hover:border-[var(--gray-300)] hover:bg-[var(--gray-100)] cursor-default"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {item.icon && <i className={`${item.icon} text-sm`} aria-hidden="true" />}
                <span className="text-xs font-medium text-[var(--ink)]">{item.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
