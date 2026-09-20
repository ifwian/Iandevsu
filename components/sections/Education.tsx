"use client";

import { useEffect } from 'react';

interface TimelineEntry {
  date: string;
  title: string;
  subtitle: string[];
}

const EDUCATION: TimelineEntry[] = [
  {
    date: "2025 - 2029 (Expected)",
    title: "BS in Computer Science",
    subtitle: ["City College of Calamba"],
  },
];

const CERTIFICATIONS: TimelineEntry[] = [
  {
    date: "2026",
    title: "HackerRank",
    subtitle: ["- Python (Basic)", "- Java (Basic)", "- JavaScript (Intermediate)", "- C# (Basic)"],
  },
  {
    date: "2025",
    title: "Certification Name (Ongoing)",
    subtitle: ["Issuing Organization"],
  },
];

function TimelineGroup({ heading, entries }: { heading: string; entries: TimelineEntry[] }) {
  return (
    <div>
      {/* Group Heading in Kode Mono */}
      <p 
        className="micro-label mb-4 text-[11px] font-medium uppercase tracking-wider text-[var(--gray-400)]"
        style={{ fontFamily: "'Kode Mono', monospace" }}
      >
        {heading}
      </p>
      <div>
        {entries.map((entry, i) => (
          <div
            key={i}
            className="py-4 border-t border-[var(--gray-200)] first:border-t-0"
          >
            {/* Entry Date in Kode Mono */}
            <p 
              className="micro-label mb-1 text-[11px] uppercase tracking-wider text-[var(--gray-400)]"
              style={{ fontFamily: "'Kode Mono', monospace" }}
            >
              {entry.date}
            </p>

            {/* Entry Title in Kode Mono */}
            <p 
              className="text-sm sm:text-base font-semibold text-[var(--ink)] tracking-tight"
              style={{ fontFamily: "'Kode Mono', monospace" }}
            >
              {entry.title}
            </p>

            {/* Subtitle Lines in Geist Mono */}
            {entry.subtitle.map((line, j) => (
              <p 
                key={j} 
                className="text-xs sm:text-sm mt-1 leading-relaxed text-[var(--gray-400)]"
              >
                {line}
              </p>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Education() {
  // Inject Google Fonts dynamically
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
      id="education" 
      className="px-5 py-12 lg:px-6 lg:pl-56"
      style={{ fontFamily: "'Geist Mono', monospace" }}
    >
      <div className="max-w-4xl">
        {/* Eyebrow Header */}
        <p className="section-eyebrow text-xs mb-1 text-[var(--gray-500)] font-medium">05 &mdash; education</p>

        {/* Main Heading in Kode Mono */}
        <h2 
          className="mb-2 text-2xl font-semibold tracking-tight text-[var(--ink)]"
          style={{ fontFamily: "'Kode Mono', monospace" }}
        >
          education &amp; certifications
        </h2>

        {/* Subtitle in Geist Mono */}
        <p className="mb-8 max-w-[46ch] text-xs sm:text-sm leading-relaxed text-[var(--gray-400)]" style={{ lineHeight: 1.6 }}>
          Where I&rsquo;ve studied, and what I&rsquo;ve earned along the way.
        </p>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 pt-6 border-t border-[var(--gray-200)]">
          <div className="md:pr-8 md:border-r md:border-[var(--gray-200)]">
            <TimelineGroup heading="education" entries={EDUCATION} />
          </div>
          <div>
            <TimelineGroup heading="certifications" entries={CERTIFICATIONS} />
          </div>
        </div>
      </div>
    </section>
  );
}