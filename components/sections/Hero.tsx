"use client";

import { useEffect, useState } from 'react';
import PixelTransition from '@/components/ui/PixelTransition';

interface LinkItem {
  label: string;
  href: string;
  external: boolean;
}

interface StatItem {
  label: string;
  value: string;
  href: string;
  external: boolean;
}

const LINKS: LinkItem[] = [
  { label: "instagram", href: "https://www.instagram.com/ifwiannn/", external: true },
  { label: "github", href: "https://github.com/ifwian", external: true },
  { label: "linkedin", href: "https://www.linkedin.com/in/ifwiannn/", external: true },
];

export default function Hero() {
  const [commitCount, setCommitCount] = useState<string>("Loading...");

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

    async function fetchCommits() {
      try {
        const response = await fetch('https://api.github.com/search/commits?q=author:ifwian');
        if (response.ok) {
          const data = await response.json();
          setCommitCount(`${data.total_count}+`);
        } else {
          setCommitCount("350+");
        }
      } catch (error) {
        console.error('Error fetching commits:', error);
        setCommitCount("350+");
      }
    }

    fetchCommits();
  }, []);

  const STATS: StatItem[] = [
    { label: "REPOS", value: "12 Public", href: "https://github.com/ifwian?tab=repositories", external: true },
    { label: "COMMITS", value: commitCount, href: "https://github.com/ifwian", external: true },
    { label: "PROJECTS", value: "5 Done", href: "#projects", external: false },
    { label: "STATUS", value: "Busy", href: "#about", external: false },
  ];

  return (
    <section 
      id="home" 
      className="px-5 pt-12 pb-16 lg:px-6 lg:pl-56"
      style={{ fontFamily: "'Geist Mono', monospace" }}
    >
      <div className="max-w-4xl">

        {/* Eyebrow at the top */}
        <p className="section-eyebrow mb-6 text-xs text-[var(--gray-400)]">01 &mdash; home</p>

        {/* Combined Hero Grid */}
        <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] lg:grid-cols-[200px_1fr] items-start gap-6">
          
          {/* Profile Picture */}
          <PixelTransition
            firstContent={
              <img
                src="/images/anime.jfif"
                alt="Photo of Marianne"
                className="h-full w-full object-cover block"
              />
            }
            secondContent={  
              <img
                src="/images/ianface.png"
                alt="Photo of Marianne Hover"
                className="h-full w-full object-cover block"
              />
            }
            gridSize={7}
            pixelColor="var(--ink)"
            animationStepDuration={0.3}
            className="w-full aspect-[5/6] overflow-hidden shrink-0 rounded-none border border-[var(--gray-200)]"
          />

          {/* Right Column */}
          <div className="flex flex-col text-left space-y-4">
            
            {/* Top section: Name and Subtitle */}
            <div>
              <h1 
                className="text-2xl font-semibold tracking-tight text-[var(--ink)] sm:text-3xl"
                style={{ fontFamily: "'Kode Mono', monospace" }}
              >
                Marianne Napa&ntilde;o
              </h1>
              <h2 className="mt-1 text-xs font-medium sm:text-sm text-[var(--gray-400)]" style={{ fontFamily: "'Kode Mono', monospace" }}>
                Computer Science Student &amp; Aspiring Web Developer
              </h2>
            </div>

            {/* Middle section: Quote and notes */}
            <div className="space-y-2.5 text-xs sm:text-sm leading-relaxed text-[var(--gray-400)]" style={{ lineHeight: 1.6 }}>
              <p className="italic text-[var(--gray-400)]">
                &ldquo;Too curious to stick to one thing.&rdquo;
              </p>
              <p className="max-w-lg">
                This portfolio is a work in progress: a space to share my journey and showcase projects as my skills grow.
              </p>
            </div>

            {/* Bottom section: Social Links */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1" style={{ fontFamily: "'Kode Mono', monospace" }}>
              {LINKS.map((link: LinkItem) => (
                <a
                  key={link.label}
                  href={link.href}
                  target={link.external ? "_blank" : undefined}
                  rel={link.external ? "noopener noreferrer" : undefined}
                  className="link-arrow group text-xs text-[var(--gray-400)] hover:text-[var(--ink)] transition-colors flex items-center gap-1"
                >
                  {link.label}{" "}
                  <span className="arrow-glyph text-[10px] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
                    {String.fromCharCode(8599)}
                  </span>
                </a>
              ))}
            </div>

          </div>
        </div>

        {/* Stat Bar */}
        <div className="mt-12 border-t border-[var(--gray-200)] grid grid-cols-2 sm:grid-cols-4">
          {STATS.map((stat: StatItem, idx: number) => (
            <a 
              key={stat.label}
              href={stat.href}
              target={stat.external ? "_blank" : undefined}
              rel={stat.external ? "noopener noreferrer" : undefined}
              className={`group py-4 px-4 flex flex-col justify-center transition-colors hover:bg-[var(--gray-100)] cursor-pointer ${
                idx !== 0 ? 'sm:border-l sm:border-[var(--gray-200)]' : ''
              } ${
                idx % 2 === 1 ? 'border-l border-[var(--gray-200)] sm:border-l' : ''
              } ${
                idx >= 2 ? 'border-t sm:border-t-0 border-[var(--gray-200)]' : ''
              }`}
            >
              <div 
                className="flex items-baseline gap-1" 
                style={{ fontFamily: "'Kode Mono', monospace" }}
              >
                <span className="text-base sm:text-lg font-semibold tracking-tight text-[var(--ink)] group-hover:text-[var(--gray-100)]">
                  {stat.value}
                </span>

                {stat.label === "STATUS" && (
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse ml-0.5 self-center" />
                )}

                <span className="text-[10px] text-[var(--gray-400)] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--ink)]">
                  {String.fromCharCode(8599)}
                </span>
              </div>
              <span 
                className="mt-1 text-[10px] tracking-widest uppercase font-normal transition-colors group-hover:text-[var(--gray-400)]" 
                style={{ 
                  color: "var(--gray-500)", 
                  fontFamily: "'Kode Mono', monospace" 
                }}
              >
                {stat.label}
              </span>
            </a>
          ))}
        </div>

      </div>
    </section>
  );
}