interface TimelineEntry {
  date: string;
  title: string;
  subtitle: string[];
}

const EDUCATION: TimelineEntry[] = [
  {
    date: "2025-2029 (soon) – Present",
    title: "BS in Computer Science",
    subtitle: ["City College of Calamba"],
  },
];

const CERTIFICATIONS: TimelineEntry[] = [
  {
    date: "2026",
    title: "HackerRank",
    subtitle: ["– Python (Basic)", "– Java (Basic)", "– JavaScript (Intermediate)", "– C# (Basic)"],
  },
  {
    date: "2025",
    title: "Certification Name (on going)",
    subtitle: ["Issuing Organization"],
  },
];

function TimelineGroup({ heading, entries }: { heading: string; entries: TimelineEntry[] }) {
  return (
    <div>
      <p className="micro-label mb-4">{heading}</p>
      <div>
        {entries.map((entry, i) => (
          <div
            key={i}
            className="py-5"
            style={{ borderTop: i === 0 ? "none" : "1px solid var(--gray-200)" }}
          >
            <p className="micro-label mb-1">{entry.date}</p>
            <p className="text-[0.98rem] font-semibold">{entry.title}</p>
            {entry.subtitle.map((line, j) => (
              <p key={j} className="text-sm" style={{ color: "var(--gray-500)" }}>
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
    <section id="education" className="px-5 py-16 lg:px-6 lg:pl-56">
      <div className="max-w-4xl">
        <p className="section-eyebrow">03 &mdash; education</p>
        <h2 className="mb-2 text-2xl font-semibold tracking-tight">education &amp; certifications</h2>
        <p className="mb-8 max-w-[46ch]" style={{ color: "var(--gray-500)" }}>
          Where I&rsquo;ve studied, and what I&rsquo;ve earned along the way.
        </p>

        <div className="grid grid-cols-1 gap-10 md:grid-cols-2" style={{ borderTop: "1px solid var(--gray-200)" }}>
          <div style={{ borderRight: "1px solid var(--gray-200)", paddingTop: "1.5rem" }} className="md:pr-8">
            <TimelineGroup heading="education" entries={EDUCATION} />
          </div>
          <div style={{ paddingTop: "1.5rem" }}>
            <TimelineGroup heading="certifications" entries={CERTIFICATIONS} />
          </div>
        </div>
      </div>
    </section>
  );
}
