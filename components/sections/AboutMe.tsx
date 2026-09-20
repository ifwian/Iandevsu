"use client";

import { useEffect } from "react";

interface Fact {
  label: string;
  value: string;
}

const FACTS: Fact[] = [
  { label: "based in", value: "Calamba, PH" },
  { label: "currently", value: "BS Computer Science" },
  { label: "first line of code", value: "HTML, age 17" },
  { label: "when not coding", value: "Photography or Badminton" },
];

const GOALS: string[] = [
  "Master Java and SQL databases without accidentally dropping tables in production.",
  "Build software projects—small, big, or whatever works after a 3 AM bug fix.",
  "Transition from 'vibe-coding' to actually understanding why my own code works.",
];

export default function AboutMe() {
  // Dynamic Google Font Injection for Kode Mono & Geist Mono
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
      id="about" 
      className="px-5 py-16 lg:px-6 lg:pl-56 flex justify-center"
      style={{ fontFamily: "'Geist Mono', monospace" }}
    >
      <div className="w-full max-w-4xl mx-auto">
        {/* Section Eyebrow in Kode Mono */}
        <p 
          className="section-eyebrow text-xs sm:text-sm mb-1.5 text-white/50 tracking-wider"
          style={{ fontFamily: "'Kode Mono', monospace" }}
        >
          02 &mdash; about
        </p>

        {/* Section Heading in Kode Mono */}
        <h2 
          className="mb-6 text-xl sm:text-2xl font-bold tracking-tight text-white leading-tight"
          style={{ fontFamily: "'Kode Mono', monospace" }}
        >
          about me
        </h2>

        {/* Bio Paragraph in Geist Mono */}
        <div className="mb-10 max-w-xl space-y-4 text-xs sm:text-sm leading-relaxed text-white/70">
          <p>
            Started with traditional coding, stayed for the art of vibe coding. Why write 
            loops manually when you can just vibe-check your code, blame the AI when it breaks, 
            and call it a feature? Welcome to my sophomore portfolio.
          </p>
        </div>

        {/* Quick Facts Grid in Geist Mono & Kode Mono Labels */}
        <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {FACTS.map((f: Fact) => (
            <div 
              key={f.label} 
              className="card p-3.5 rounded-xl bg-white/[0.03] border border-white/10"
            >
              <p 
                className="micro-label mb-1 text-[10px] uppercase tracking-wider text-white/40"
                style={{ fontFamily: "'Kode Mono', monospace" }}
              >
                {f.label}
              </p>
              <p className="text-xs sm:text-sm font-medium text-white/90">
                {f.value}
              </p>
            </div>
          ))}
        </div>

        {/* Current Goals in Geist Mono */}
        <div>
          <p 
            className="micro-label mb-3 text-[11px] uppercase tracking-wider text-white/50 font-medium"
            style={{ fontFamily: "'Kode Mono', monospace" }}
          >
            right now, I&rsquo;m working toward
          </p>
          <ul className="space-y-2 text-xs sm:text-sm text-white/70">
            {GOALS.map((goal: string) => (
              <li key={goal} className="flex gap-2">
                <span className="text-white/40" aria-hidden="true">&mdash;</span>
                {goal}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}