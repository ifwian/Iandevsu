"use client";

import { useEffect, useState } from "react";

const GITHUB_USERNAME = "ifwian";

interface ContributionDay {
  date: string;
  count: number;
  level: number;
}

interface ApiResponse {
  contributions?: ContributionDay[];
  total?: Record<string, number> | number;
}

const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "short" });

function toWeeks(days: ContributionDay[]): (ContributionDay | null)[][] {
  const weeks: (ContributionDay | null)[][] = [];
  let current: (ContributionDay | null)[] = [];

  days.forEach((day, i) => {
    const weekday = new Date(`${day.date}T00:00:00`).getDay();
    if (i === 0) for (let pad = 0; pad < weekday; pad++) current.push(null);
    current.push(day);
    if (weekday === 6 || i === days.length - 1) {
      weeks.push(current);
      current = [];
    }
  });

  return weeks;
}

function MonthLabels({ weeks }: { weeks: (ContributionDay | null)[][] }) {
  let lastMonth: number | null = null;
  const labels: { text: string; leftPct: number }[] = [];

  weeks.forEach((week, weekIndex) => {
    const firstRealDay = week.find((d) => d);
    if (!firstRealDay) return;
    const month = new Date(`${firstRealDay.date}T00:00:00`).getMonth();
    if (month !== lastMonth) {
      labels.push({
        text: monthFormatter.format(new Date(`${firstRealDay.date}T00:00:00`)),
        leftPct: (weekIndex / weeks.length) * 100,
      });
      lastMonth = month;
    }
  });

  return (
    <div className="micro-label relative mb-2 h-3.5 w-full">
      {labels.map((label, i) => (
        <span key={i} className="absolute whitespace-nowrap" style={{ left: `${label.leftPct}%` }}>
          {label.text}
        </span>
      ))}
    </div>
  );
}

const LEVEL_DOT: Record<number, { size: number; color: string }> = {
  0: { size: 2.5, color: "var(--gray-300)" },
  1: { size: 4.5, color: "var(--gray-400)" },
  2: { size: 6.5, color: "var(--gray-600)" },
  3: { size: 8.5, color: "var(--ink)" },
  4: { size: 10.5, color: "var(--ink)" },
};

export default function GithubActivity() {
  const [weeks, setWeeks] = useState<(ContributionDay | null)[][] | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Changed ?y=last to ?y=2026 to show Jan–Dec view
        const res = await fetch(`https://github-contributions-api.jogruber.de/v4/${GITHUB_USERNAME}?y=2026`);
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        const data: ApiResponse = await res.json();
        const contributions = data.contributions ?? [];
        if (!contributions.length) throw new Error("No contribution data returned");
        if (cancelled) return;

        setWeeks(toWeeks(contributions));
        const calculatedTotal = contributions.reduce((sum, day) => sum + day.count, 0);
        setTotal(calculatedTotal);
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section id="github" className="px-5 py-16 lg:px-6 lg:pl-56">
      <div className="max-w-4xl">
        <div className="mb-2 flex items-baseline justify-between">
          <p className="section-eyebrow" style={{ marginBottom: 0 }}>
            04 &mdash; github
          </p>
          <a
            href={`https://github.com/${GITHUB_USERNAME}`}
            target="_blank"
            rel="noopener noreferrer"
            className="link-arrow"
          >
            @{GITHUB_USERNAME} <span className="arrow-glyph">&#8599;</span>
          </a>
        </div>
        <h2 className="mb-2 text-2xl font-semibold tracking-tight">github activity</h2>
        <p className="mb-8 max-w-[46ch]" style={{ color: "var(--gray-500)" }}>
          A snapshot of my contribution history for 2026.
        </p>

        <div className="card p-7">
          <div className="w-full pb-1">
            {weeks && <MonthLabels weeks={weeks} />}
            <div
              className="grid w-full"
              style={{
                gridTemplateColumns: `repeat(${weeks?.length ?? 53}, 1fr)`,
                gridTemplateRows: "repeat(7, 1fr)",
                gridAutoFlow: "column",
                aspectRatio: `${weeks?.length ?? 53} / 7`,
              }}
              aria-hidden="true"
            >
              {weeks?.map((week, wi) =>
                week.map((day, di) => {
                  const dot = day ? LEVEL_DOT[day.level] ?? LEVEL_DOT[0] : null;
                  return (
                    <div
                      key={`${wi}-${di}`}
                      title={day ? `${day.count} contribution${day.count === 1 ? "" : "s"} on ${day.date}` : undefined}
                      className="flex items-center justify-center"
                    >
                      {dot && (
                        <span
                          style={{
                            display: "block",
                            width: `${(dot.size / 14) * 100}%`,
                            aspectRatio: "1 / 1",
                            borderRadius: "50%",
                            backgroundColor: dot.color,
                          }}
                        />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
          <p className="mt-4 text-sm" style={{ color: "var(--gray-500)" }}>
            {error
              ? "Couldn't load live GitHub activity right now — check back later."
              : total !== null
                ? `${total.toLocaleString()} contributions in 2026`
                : "Loading contribution activity…"}
          </p>
        </div>
      </div>
    </section>
  );
}
