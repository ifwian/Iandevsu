"use client";

import { useEffect } from 'react';

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
  "Land my first internship as a web developer.",
  "Ship a full-stack project with a real backend, not just static pages.",
  "Get comfortable enough with SQL and Node.js to stop calling them 'currently learning'.",
];

export default function AboutMe() {
  // Load both Kode Mono and Geist Mono fonts dynamically
  useEffect(() => {
    const linkKode = document.createElement('link');
    linkKode.href = 'https://fonts.googleapis.com/css2?family=Kode+Mono:wght@400..700&display=swap';
    linkKode.rel = 'stylesheet';
    document.head.appendChild(linkKode);

    const linkGeist = document.createElement('link');
    linkGeist.href = 'https://fonts.googleapis.com/css2?family=Geist+Mono:wght@100..900&display=swap';
    linkGeist.rel = 'stylesheet';
    document.head.appendChild(linkGeist);
  }, []);

  return (
    <section 
      id="about" 
      className="px-5 py-16 lg:px-6 lg:pl-56 flex justify-center"
      style={{ fontFamily: "'Geist Mono', monospace" }}
    >
      <div className="w-full max-w-4xl mx-auto">
        <p className="section-eyebrow mb-6 text-xs text-[var(--gray-400)]" style={{ fontFamily: "'Geist Mono', monospace" }}>
          02 &mdash; about
        </p>
        
        <h2 
          className="mb-6 text-2xl font-semibold tracking-tight text-[var(--ink)] sm:text-3xl"
          style={{ fontFamily: "'Kode Mono', monospace" }}
        >
          about me
        </h2>

        <div className="mb-10 max-w-[550px] space-y-4 text-xs sm:text-sm leading-relaxed text-[var(--gray-400)]" style={{ lineHeight: 1.75 }}>
          <p>
            My path into tech started with a simple question: <i className="text-[var(--gray-400)]">&ldquo;How hard could it really be to
            build this myself?&rdquo;</i> (Spoiler: very hard, but it turns out I love the headache). That 
            relentless tinkering is the main reason this portfolio exists.
          </p>
        </div>

        {/* Quick Facts Grid */}
        <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {FACTS.map((f: Fact) => (
            <div key={f.label} className="card p-4 border border-[var(--gray-200)] bg-[var(--gray-100)]">
              <p 
                className="micro-label mb-1 text-[10px] uppercase tracking-widest text-[var(--gray-400)]" 
                style={{ fontFamily: "'Kode Mono', monospace" }}
              >
                {f.label}
              </p>
              <p className="text-sm font-medium text-[var(--ink)]">{f.value}</p>
            </div>
          ))}
        </div>

        {/* Current Goals */}
        <div>
          <p 
            className="micro-label mb-3 text-[10px] uppercase tracking-widest text-[var(--gray-400)]" 
            style={{ fontFamily: "'Kode Mono', monospace" }}
          >
            right now, I&rsquo;m working toward
          </p>
          <ul className="space-y-2 text-xs sm:text-sm text-[var(--gray-400)]">
            {GOALS.map((goal: string) => (
              <li key={goal} className="flex gap-2">
                <span aria-hidden="true" className="text-[var(--gray-400)]">&mdash;</span>
                {goal}
              </li>
            ))}
          </ul>
        </div>

      </div>
    </section>
  );
}