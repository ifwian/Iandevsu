"use client";

import { type ComponentType } from "react";
import { ArrowUpRight } from "lucide-react";
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

/**
 * A metric cell is a link; a status cell is a tag. Modelled as a union so a
 * tag can never carry an href, and a link can never be silently un-navigable.
 */
type StatItem =
  | { label: string; value: string; href: string; external: boolean; tag?: false }
  | { label: string; value: string; tag: true };

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

const BUILDS: string[] = [
  "websites",
  "little programs",
  "things I probably didn't need to make",
];

export default function Hero() {
  const stats: StatItem[] = [
    { label: "REPOS", value: "12 Public", href: "https://github.com/ifwian?tab=repositories", external: true },
    { label: "COMMITS", value: "105+", href: "https://github.com/ifwian", external: true },
    { label: "PROJECTS", value: "5 Done", href: "#projects", external: false },
    // A live status, not a metric: rendered as a non-navigating tag with an
    // indicator light, so it is never mistaken for a link like the other three.
    { label: "building", value: "Building", tag: true },
  ];

  return (
    <section
      id="home"
      className="section-frame px-5 py-16 lg:px-6"
      style={{ fontFamily: "var(--font-mono)" }}
    >
      <div className="max-w-4xl mx-auto">
        {/* Flex, not grid, so `items-center` actually centres the text against
            the portrait instead of being overridden at md+. The previous
            `md:items-start` pinned the column to the top and left it
            unbounded beneath the image. */}
        <div className="flex flex-col items-center gap-7 md:flex-row md:items-center md:gap-8">
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
            className="mx-auto aspect-[5/6] w-48 shrink-0 overflow-hidden border border-[var(--gray-200)] sm:w-56 md:w-[180px] lg:w-[200px]"
          />

          {/* max-w keeps this a defined column rather than a 660px-wide band,
              and keeps the stack short enough to sit within the portrait's
              height so `items-center` reads as genuinely centred. */}
          <div className="flex min-w-0 w-full flex-col items-center text-center md:max-w-md md:items-start md:text-left">
            {/* Section indicator, matching the numbered format the other
                sections use. Uppercased by .section-eyebrow. */}
            <p className="section-eyebrow">01 &mdash; who am i?</p>

            {/* Name takes the display role (Kode Mono), like every other
                heading on the site. */}
            <h1
              className="text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              marianne napaño
            </h1>

            <p
              className="mt-2 text-xs font-medium text-[var(--gray-500)] sm:text-sm"
              style={{ fontFamily: "var(--font-body)" }}
            >
              Computer Science Student | Aspiring Web Developer
            </p>

            <div
              className="mt-6 max-w-[48ch] text-xs leading-relaxed text-[var(--gray-500)] sm:text-sm"
              style={{ lineHeight: 1.65 }}
            >
              <p className="italic">“Too curious to stick to one thing.”</p>
            </div>

            {/* "I like to build" -- numbered to match the sidebar's nav format.
                Kode Mono, same as every other label on the site. */}
            <div className="mt-6 w-full">
              <p
                className="micro-label mb-2.5"
                style={{ fontFamily: "var(--font-display)" }}
              >
                i like to build
              </p>
              <ul className="space-y-1.5" style={{ fontFamily: "var(--font-display)" }}>
                {BUILDS.map((build, index) => (
                  <li
                    key={build}
                    className="flex gap-2.5 text-[12px] leading-[1.5] text-[var(--gray-500)]"
                  >
                    <span className="w-5 shrink-0 text-[var(--gray-400)]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span>{build}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* The email now lives in the sidebar footer, so it is not repeated
                here. The social links stay, since the sidebar no longer has
                them. */}
            <div className="mt-6 flex w-fit max-w-full flex-wrap items-start justify-start gap-2 text-left">
              {SOCIAL_ITEMS.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="group inline-flex items-center gap-2 rounded-full border border-[var(--gray-300)] px-3 py-2 text-[11px] normal-case tracking-[0.04em] text-[var(--gray-500)] transition-colors hover:border-[var(--ink)] hover:text-[var(--ink)]"
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

        <div className="mt-12 grid grid-cols-2 border-t border-[var(--gray-200)] sm:grid-cols-4">
          {stats.map((stat, index) => {
            // Border logic is shared so the tag cell keeps the same grid rhythm
            // as the link cells.
            const cellClass = `flex flex-col justify-center px-4 py-4 ${
              index !== 0 ? "sm:border-l sm:border-[var(--gray-200)]" : ""
            } ${
              index % 2 === 1 ? "border-l border-[var(--gray-200)]" : ""
            } ${
              index >= 2 ? "border-t border-[var(--gray-200)] sm:border-t-0" : ""
            }`;

            // The status cell: a solid green light with a soft pulsing halo
            // (the "glow") sitting immediately left of the word. #22c55e is
            // the same presence green already used by the chat presence dots.
            if (stat.tag) {
              return (
                <div key={stat.label} className={cellClass} style={{ fontFamily: "var(--font-mono)" }}>
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22c55e] opacity-60" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-[#22c55e]" />
                    </span>
                    <span className="text-base font-semibold tracking-tight text-[var(--ink)] sm:text-lg">
                      {stat.value}
                    </span>
                  </div>
                  <span className="mt-1 text-[11px] font-normal uppercase tracking-widest text-[var(--gray-500)]">
                    {stat.label}
                  </span>
                </div>
              );
            }

            return (
              <a
                key={stat.label}
                href={stat.href}
                target={stat.external ? "_blank" : undefined}
                rel={stat.external ? "noopener noreferrer" : undefined}
                className={`group cursor-pointer transition-colors hover:bg-[var(--gray-100)] ${cellClass}`}
              >
                <div
                  className="flex items-baseline gap-1"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  <span className="text-base font-semibold tracking-tight text-[var(--ink)] sm:text-lg">
                    {stat.value}
                  </span>
                  <span className="text-[11px] text-[var(--gray-400)] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--ink)]">
                    ↗
                  </span>
                </div>
                <span
                  className="mt-1 text-[11px] font-normal uppercase tracking-widest text-[var(--ink)]"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {stat.label}
                </span>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
