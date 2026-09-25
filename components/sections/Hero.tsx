"use client";

import { useEffect, useState, type ComponentType } from "react";
import { ArrowUpRight, Mail } from "lucide-react";
import GithubIcon from "@/components/icons/GithubIcon";
import PixelTransition from "@/components/ui/PixelTransition";

interface SocialIconProps {
  size?: number;
  className?: string;
}

type SocialIcon = ComponentType<SocialIconProps>;

interface SocialItem {
  label: string;
  href: string;
  Icon: SocialIcon;
}

interface StatItem {
  label: string;
  value: string;
  href: string;
  external: boolean;
}

const EMAIL = "iandevsu@gmail.com";

const SOCIAL_ITEMS: SocialItem[] = [
  { label: "github", href: "https://github.com/ifwian", Icon: GithubIcon },
  { label: "linkedin", href: "https://www.linkedin.com/in/ifwiannn/", Icon: LinkedinIcon },
  { label: "instagram", href: "https://www.instagram.com/ifwiannn/", Icon: InstagramIcon },
];

function LinkedinIcon({ size = 15, className }: SocialIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M6 8.5V18" />
      <path d="M6 5.5v.01" />
      <path d="M10 18v-5.25a3.25 3.25 0 0 1 6.5 0V18" />
      <path d="M10 12.5V18" />
    </svg>
  );
}

function InstagramIcon({ size = 15, className }: SocialIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.4" cy="6.6" r=".8" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default function Hero() {
  const [commitCount, setCommitCount] = useState<string>("Loading...");

  useEffect(() => {
    const linkKode = document.createElement("link");
    linkKode.href = "https://fonts.googleapis.com/css2?family=Kode+Mono:wght@400..700&display=swap";
    linkKode.rel = "stylesheet";
    document.head.appendChild(linkKode);

    const linkGeist = document.createElement("link");
    linkGeist.href = "https://fonts.googleapis.com/css2?family=Geist+Mono:wght@100..900&display=swap";
    linkGeist.rel = "stylesheet";
    document.head.appendChild(linkGeist);

    async function fetchCommits() {
      try {
        const response = await fetch("https://api.github.com/search/commits?q=author:ifwian");
        if (response.ok) {
          const data = await response.json();
          setCommitCount(`${data.total_count}+`);
        } else {
          setCommitCount("350+");
        }
      } catch (error) {
        console.error("Error fetching commits:", error);
        setCommitCount("350+");
      }
    }

    fetchCommits();
  }, []);

  const stats: StatItem[] = [
    { label: "REPOS", value: "12 Public", href: "https://github.com/ifwian?tab=repositories", external: true },
    { label: "COMMITS", value: commitCount, href: "https://github.com/ifwian", external: true },
    { label: "PROJECTS", value: "5 Done", href: "#projects", external: false },
    { label: "STATUS", value: "Busy", href: "#about", external: false },
  ];

  return (
    <section
      id="home"
      className="px-5 pt-12 pb-16 lg:px-6"
      style={{ fontFamily: "'Geist Mono', monospace" }}
    >
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 items-center justify-items-center gap-7 md:grid-cols-[180px_1fr] md:items-start md:justify-items-start lg:grid-cols-[200px_1fr] lg:gap-8">
          <PixelTransition
            firstContent={
              <img
                src="/images/anime.jfif"
                alt="Photo of Marianne"
                className="block h-full w-full object-cover"
              />
            }
            secondContent={
              <img
                src="/images/ianface.png"
                alt="Photo of Marianne Hover"
                className="block h-full w-full object-cover"
              />
            }
            gridSize={7}
            pixelColor="var(--bg)"
            animationStepDuration={0.3}
            className="mx-auto aspect-[5/6] w-48 shrink-0 overflow-hidden border border-[var(--gray-200)] sm:w-56 lg:w-full"
          />

          <div className="flex min-w-0 w-full flex-col items-center text-center md:items-start md:text-left">
            <h1
              className="text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl"
              style={{ fontFamily: "'Kode Mono', monospace" }}
            >
              Marianne Napaño
            </h1>

            <p
              className="mt-2 text-xs font-medium text-[var(--gray-500)] sm:text-sm"
              style={{ fontFamily: "'Kode Mono', monospace" }}
            >
              Computer Science Student | Aspiring Web Developer
            </p>

            <div
              className="mt-6 max-w-[48ch] text-xs leading-relaxed text-[var(--gray-500)] sm:text-sm"
              style={{ lineHeight: 1.65 }}
            >
              <p className="italic">“Too curious to stick to one thing.”</p>
            </div>

            <div className="my-4 flex w-fit max-w-full flex-col items-start gap-4 self-start py-2 text-left">
              <a
                href={`mailto:${EMAIL}`}
                className="inline-flex items-center gap-2 text-xs text-[var(--gray-500)] transition-colors hover:text-[var(--ink)]"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                <Mail size={14} strokeWidth={1.7} />
                <span>{EMAIL}</span>
              </a>

              <div className="flex max-w-full flex-wrap items-start justify-start gap-2 text-left">
                {SOCIAL_ITEMS.map(({ label, href, Icon }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="group inline-flex items-center gap-2 rounded-full border border-[var(--gray-300)] px-3 py-2 text-[10px] normal-case tracking-[0.04em] text-[var(--gray-500)] transition-colors hover:border-[var(--ink)] hover:text-[var(--ink)]"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    <Icon size={13} />
                    <span>{label}</span>
                    <ArrowUpRight
                      size={11}
                      strokeWidth={1.7}
                      className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                    />
                  </a>
                ))}
            </div>
          </div>
        </div>
        </div>

        <div className="mt-12 grid grid-cols-2 border-t border-[var(--gray-200)] sm:grid-cols-4">
          {stats.map((stat, index) => (
            <a
              key={stat.label}
              href={stat.href}
              target={stat.external ? "_blank" : undefined}
              rel={stat.external ? "noopener noreferrer" : undefined}
              className={`group flex cursor-pointer flex-col justify-center px-4 py-4 transition-colors hover:bg-[var(--gray-100)] ${
                index !== 0 ? "sm:border-l sm:border-[var(--gray-200)]" : ""
              } ${
                index % 2 === 1 ? "border-l border-[var(--gray-200)]" : ""
              } ${
                index >= 2 ? "border-t border-[var(--gray-200)] sm:border-t-0" : ""
              }`}
            >
              <div
                className="flex items-baseline gap-1"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                <span className="text-base font-semibold tracking-tight text-[var(--ink)] sm:text-lg">
                  {stat.value}
                </span>
                {stat.label === "STATUS" && (
                  <span className="ml-0.5 h-2 w-2 self-center rounded-full bg-amber-500 animate-pulse" />
                )}
                <span className="text-[10px] text-[var(--gray-400)] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--ink)]">
                  ↗
                </span>
              </div>
              <span
                className="mt-1 text-[10px] font-normal uppercase tracking-widest text-[var(--ink)]"
                style={{ fontFamily: "var(--font-mono)" }}
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
