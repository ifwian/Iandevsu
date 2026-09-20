"use client";

import { useState } from "react";

interface StackItem {
  name: string;
  icon: string;
  note: string;
}

interface StackCategory {
  key: string;
  label: string;
  items: StackItem[];
}

const CATEGORIES: StackCategory[] = [
  {
    key: "core",
    label: "core",
    items: [
      { name: "HTML", icon: "devicon-html5-plain colored", note: "Semantic, accessible markup for every project." },
      { name: "CSS", icon: "devicon-css3-plain colored", note: "Layout, responsive design, and small polish details." },
      { name: "JavaScript", icon: "devicon-javascript-plain colored", note: "DOM manipulation, fetch calls, and interactivity." },
    ],
  },
  {
    key: "tools",
    label: "tools",
    items: [
      { name: "Git", icon: "devicon-git-plain colored", note: "Version control for every project, big or small." },
      { name: "GitHub", icon: "devicon-github-original", note: "Where all of this is hosted and versioned." },
      { name: "Figma", icon: "devicon-figma-plain colored", note: "Wireframing and UI mockups before I write code." },
    ],
  },
  {
    key: "learning",
    label: "now learning",
    items: [
      { name: "React", icon: "devicon-react-original colored", note: "Building component-driven UIs, like this site." },
      { name: "Node.js", icon: "devicon-nodejs-plain colored", note: "Backend basics — APIs and small servers." },
      { name: "SQL", icon: "devicon-mysql-plain colored", note: "Querying and structuring relational data." },
      { name: "Java", icon: "devicon-java-plain colored", note: "OOP fundamentals from coursework." },
      { name: "Python", icon: "devicon-python-plain colored", note: "Scripting and problem-solving practice." },
    ],
  },
];

export default function TechStackShowcase() {
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].key);
  const [activeItem, setActiveItem] = useState<StackItem>(CATEGORIES[0].items[0]);

  const category = CATEGORIES.find((c) => c.key === activeCategory) ?? CATEGORIES[0];

  return (
    <section id="stack" className="px-5 py-16 lg:px-6 lg:pl-56">
      <div className="max-w-4xl">
        <p className="section-eyebrow">02 &mdash; stack</p>
        <h2 className="mb-2 text-2xl font-semibold tracking-tight">tech stack</h2>
        <p className="mb-8 max-w-[46ch]" style={{ color: "var(--gray-500)" }}>
          Tools I use regularly, and what I&rsquo;m picking up right now.
        </p>

        <div className="mb-6 flex gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => {
                setActiveCategory(cat.key);
                setActiveItem(cat.items[0]);
              }}
              className={`pill ${activeCategory === cat.key ? "pill-inverted" : ""}`}
              style={{ fontSize: "10px", padding: "4px 12px" }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="mb-6 flex flex-wrap gap-2.5">
          {category.items.map((item) => (
            <button
              key={item.name}
              type="button"
              onMouseEnter={() => setActiveItem(item)}
              onFocus={() => setActiveItem(item)}
              onClick={() => setActiveItem(item)}
              className="flex items-center gap-2 rounded-xl border px-4 py-3 text-sm transition-colors"
              style={{
                borderColor: activeItem.name === item.name ? "var(--ink)" : "var(--gray-200)",
                backgroundColor: activeItem.name === item.name ? "var(--gray-50)" : "transparent",
                color: activeItem.name === item.name ? "var(--ink)" : "var(--gray-500)",
              }}
            >
              <i className={`${item.icon} text-lg`} aria-hidden="true" />
              {item.name}
            </button>
          ))}
        </div>

        <div className="card p-5">
          <p className="mb-1 text-sm font-semibold">{activeItem.name}</p>
          <p className="text-sm" style={{ color: "var(--gray-500)" }}>
            {activeItem.note}
          </p>
        </div>
      </div>
    </section>
  );
}
