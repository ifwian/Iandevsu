"use client";


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
      <p 
        className="micro-label mb-4 text-xs font-medium uppercase tracking-wider text-[var(--gray-500)]"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {heading}
      </p>
      <div>
        {entries.map((entry, i) => (
          <div
            key={i}
            className="py-4 border-t border-[var(--gray-200)] first:border-t-0"
          >
            <p 
              className="micro-label mb-1 text-xs uppercase tracking-wider text-[var(--gray-500)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {entry.date}
            </p>

            <p 
              className="text-sm sm:text-base font-semibold text-[var(--ink)] tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {entry.title}
            </p>

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

  return (
    <section 
      id="education" 
      className="section-frame px-5 py-16 lg:px-6"
      style={{ fontFamily: "var(--font-mono)" }}
    >
      <div className="w-full max-w-4xl mx-auto">
        <p className="section-eyebrow mb-1 font-medium">05 &mdash; education</p>

        <h2 
          className="mb-2 text-xl sm:text-2xl font-semibold tracking-tight text-[var(--ink)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          education &amp; certifications
        </h2>

        {/* Section description -- prose, so Source Serif 4. */}
        <p
          className="mb-8 max-w-xl text-[15px] leading-[1.7] text-[var(--gray-400)]"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Where I&rsquo;ve studied, and what I&rsquo;ve earned along the way.
        </p>

        <div className="grid grid-cols-1 gap-6 md:gap-8 md:grid-cols-2 pt-6 border-t border-[var(--gray-200)]">
          <div className="md:pr-8">
            <TimelineGroup heading="education" entries={EDUCATION} />
          </div>
          <div className="md:pl-8">
            <TimelineGroup heading="certifications" entries={CERTIFICATIONS} />
          </div>
        </div>
      </div>
    </section>
  );
}
