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
    if (i === 0) {
      for (let pad = 0; pad < weekday; pad++) current.push(null);
    }
    current.push(day);
    if (weekday === 6 || i === days.length - 1) {
      while (current.length < 7) current.push(null);
      weeks.push(current);
      current = [];
    }
  });

  return weeks;
}

const LEVEL_CLASSES: Record<number, string> = {
  0: "bg-[var(--gray-100)] border border-[var(--gray-200)] hover:border-[var(--gray-300)]",
  1: "bg-[var(--gray-200)] hover:bg-[var(--gray-300)]",
  2: "bg-[var(--gray-300)] hover:bg-[var(--gray-400)]",
  3: "bg-[var(--gray-400)] hover:bg-[var(--gray-300)]",
  4: "bg-[var(--ink)] hover:bg-[var(--gray-100)]",
};

export default function GithubActivity() {
  const [weeks, setWeeks] = useState<(ContributionDay | null)[][] | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
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

  const monthLabels = weeks
    ? weeks.reduce<{ text: string; weekIndex: number }[]>((acc, week, i) => {
        const firstDay = week.find((d) => d !== null);
        if (!firstDay) return acc;
        const monthText = monthFormatter.format(new Date(`${firstDay.date}T00:00:00`));
        if (acc.length === 0 || acc[acc.length - 1].text !== monthText) {
          acc.push({ text: monthText, weekIndex: i });
        }
        return acc;
      }, [])
    : [];

  const totalWeeks = weeks?.length ?? 53;

  return (
    <section 
      id="github" 
      className="px-5 py-16 lg:px-6 lg:pl-56"
      style={{ fontFamily: "'Geist Mono', monospace" }}
    >
      <div className="max-w-4xl">
        {/* Eyebrow and Profile Link */}
        <div className="mb-2 flex items-baseline justify-between">
          <p 
            className="section-eyebrow text-xs sm:text-sm mb-1.5 text-[var(--gray-400)] tracking-wider"
            style={{ fontFamily: "'Geist Mono', monospace" }}
          >
            07 &mdash; github
          </p>
          <a
            href={`https://github.com/${GITHUB_USERNAME}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[var(--gray-400)] hover:text-[var(--ink)] transition-colors flex items-center gap-1"
            style={{ fontFamily: "'Kode Mono', monospace" }}
          >
            @{GITHUB_USERNAME} <span className="text-[10px]">&#8599;</span>
          </a>
        </div>

        {/* Section Heading */}
        <h2 
          className="mb-2 text-xl sm:text-2xl font-bold tracking-tight text-[var(--ink)] leading-tight"
          style={{ fontFamily: "'Kode Mono', monospace" }}
        >
          github activity
        </h2>

        {/* Description */}
        <p className="mb-8 max-w-xl text-xs sm:text-sm leading-relaxed text-[var(--gray-500)]">
          A snapshot of my contribution history for 2026.
        </p>

        {/* Card Container with Smooth Box Hover Effects */}
        <div 
          className="card flex flex-col p-5 sm:p-7 rounded-xl bg-[var(--gray-50)] border border-[var(--gray-200)] transition-all duration-300 hover:border-[var(--gray-300)] hover:bg-[var(--gray-100)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.3)]"
        >
          <div className="w-full">
            
            {/* Month Labels */}
            <div 
              className="relative h-4 w-full mb-3 text-[10px] sm:text-[11px] text-[var(--gray-400)] uppercase"
              style={{ fontFamily: "'Kode Mono', monospace" }}
            >
              {monthLabels.map((m) => (
                <span
                  key={m.text + m.weekIndex}
                  className="absolute whitespace-nowrap"
                  style={{ left: `${(m.weekIndex / totalWeeks) * 100}%` }}
                >
                  {m.text}
                </span>
              ))}
            </div>

            {/* Contribution Grid */}
            <div
              className="grid w-full gap-[2px] sm:gap-[3px]"
              style={{
                gridTemplateColumns: `repeat(${totalWeeks}, 1fr)`,
                gridTemplateRows: "repeat(7, 1fr)",
                gridAutoFlow: "column",
              }}
            >
              {weeks?.map((week, wi) =>
                week.map((day, di) => {
                  const levelClass = day
                    ? LEVEL_CLASSES[day.level] ?? LEVEL_CLASSES[0]
                    : "bg-transparent border-transparent";
                  
                  return (
                    <div
                      key={`${wi}-${di}`}
                      title={
                        day
                          ? `${day.count} contribution${day.count === 1 ? "" : "s"} on ${day.date}`
                          : undefined
                      }
                      className={`w-full aspect-square rounded-[2px] cursor-pointer transition-all duration-150 hover:scale-125 hover:z-10 ${levelClass}`}
                    />
                  );
                })
              )}
            </div>

          </div>

          {/* Footer Summary & Legend */}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--gray-400)] pt-3 border-t border-[var(--gray-200)]">
            <p 
              style={{ 
                fontFamily: total !== null ? "'Kode Mono', monospace" : "'Geist Mono', monospace"
              }}
            >
              {error
                ? "Couldn't load live GitHub activity right now — check back later."
                : total !== null
                  ? `${total.toLocaleString()} contributions in 2026`
                  : "Loading contribution activity…"}
            </p>

            {/* Legend */}
            <div 
              className="flex items-center gap-1.5 text-[11px] text-[var(--gray-400)]"
              style={{ fontFamily: "'Kode Mono', monospace" }}
            >
              <span>Less</span>
              <div className="flex gap-1">
                <span className="w-2.5 h-2.5 rounded-[2px] bg-[var(--gray-100)] border border-[var(--gray-200)]" />
                <span className="w-2.5 h-2.5 rounded-[2px] bg-[var(--gray-200)]" />
                <span className="w-2.5 h-2.5 rounded-[2px] bg-[var(--gray-300)]" />
                <span className="w-2.5 h-2.5 rounded-[2px] bg-[var(--gray-400)]" />
                <span className="w-2.5 h-2.5 rounded-[2px] bg-[var(--ink)]" />
              </div>
              <span>More</span>
            </div>
          </div>
            
        </div>
      </div>
    </section>
  );
}