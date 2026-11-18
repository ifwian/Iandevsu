"use client";

import { useEffect, useState } from "react";
import { FileText, MapPin, Menu, X } from "lucide-react";
import { NAV_ITEMS } from "@/lib/navigation";
import { SOCIAL_ITEMS } from "@/lib/socials";
import { PROFILE } from "@/content/profile";
import ThemeToggle from "./ThemeToggle";
import "./sidebar.css";

interface SidebarProps {
  /** Section that is highlighted until the scroll-spy reports a different one. */
  active?: string;
}

const SECTION_IDS = NAV_ITEMS.map((item) => item.href);
const pad = (n: number) => String(n).padStart(2, "0");

/** Name + tagline. Shared by the rail and the mobile bar (tagline rail-only). */
function Brand({ withTagline = false }: { withTagline?: boolean }) {
  return (
    <div>
      <a href="#home" aria-label="Back to top" className="rail__name">
        {PROFILE.name}
      </a>
      {withTagline ? <p className="rail__tag">{PROFILE.tagline}</p> : null}
    </div>
  );
}

/** Numbered section list (01, 02 ...). Shared by the rail and the mobile menu. */
function NavList({ active, onNavigate }: { active: string; onNavigate: (href: string) => void }) {
  return (
    <nav aria-label="Primary navigation" className="flex flex-col">
      {NAV_ITEMS.map((item, index) => (
        <a
          key={item.href}
          href={item.href}
          aria-current={active === item.href ? "location" : undefined}
          onClick={() => onNavigate(item.href)}
          className="rail__link"
        >
          <span aria-hidden="true" className="rail__link-num">
            {pad(index + 1)}
          </span>
          {item.label}
        </a>
      ))}
    </nav>
  );
}

function Socials() {
  return (
    <ul className="rail__socials">
      {SOCIAL_ITEMS.map(({ label, href, Icon }) => (
        <li key={label}>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            title={label}
            className="rail__icon"
          >
            <Icon size={17} />
          </a>
        </li>
      ))}
    </ul>
  );
}

function ResumeButton() {
  const resume = PROFILE.links.resume;
  if (!resume) return null; // no dead link until a URL is set in profile.ts
  return (
    <a href={resume} target="_blank" rel="noopener noreferrer" className="rail__resume">
      <FileText size={13} aria-hidden="true" />
      view resume
    </a>
  );
}

/**
 * Site chrome: a fixed left rail from `lg` up (name, status, numbered sections,
 * resume, socials + theme switch) and a fixed top bar with a menu below it (the
 * 68px bar height is what `section[id]`'s scroll-margin in theme.css assumes).
 * Both read the same NAV_ITEMS; the highlighted item comes from an
 * IntersectionObserver over the sections.
 */
export default function Sidebar({ active = "#home" }: SidebarProps) {
  const [current, setCurrent] = useState<string>(active);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    const visible = new Map<string, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = `#${(entry.target as HTMLElement).id}`;
          if (entry.isIntersecting) visible.set(id, entry.boundingClientRect.top);
          else visible.delete(id);
        }
        const first = SECTION_IDS.find((id) => visible.has(id));
        if (first) setCurrent(first);
      },
      { rootMargin: "-20% 0px -65% 0px", threshold: 0 }
    );

    for (const id of SECTION_IDS) {
      const el = document.querySelector(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const go = (href: string) => {
    setCurrent(href);
    setMenuOpen(false);
  };

  return (
    <>
      {/* Desktop rail */}
      <aside className="rail" aria-label="Site sidebar">
        <div className="rail__block rail__block--brand">
          <Brand withTagline />
        </div>

        <div className="rail__block rail__block--tight">
          {PROFILE.availability ? (
            <p className="rail__meta">
              <span className="rail__dot" aria-hidden="true" />
              {PROFILE.availability}
            </p>
          ) : null}
          <p className="rail__meta">
            <MapPin size={13} aria-hidden="true" />
            {PROFILE.location.toLowerCase()}
          </p>
        </div>

        <div className="rail__block rail__block--nav">
          <NavList active={current} onNavigate={go} />
        </div>

        {PROFILE.links.resume ? (
          <div className="rail__block">
            <ResumeButton />
          </div>
        ) : null}

        <div className="rail__block rail__block--last">
          <div className="rail__foot">
            <Socials />
            <ThemeToggle bare compact />
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="topbar">
        <div className="topbar__row">
          <Brand />
          <div className="flex items-center gap-2">
            <ThemeToggle compact />
            <button
              type="button"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
              onClick={() => setMenuOpen((open) => !open)}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-muted)] transition-colors hover:text-[var(--ink)]"
            >
              {menuOpen ? <X size={16} strokeWidth={1.7} /> : <Menu size={16} strokeWidth={1.7} />}
            </button>
          </div>
        </div>

        {menuOpen ? (
          <div id="mobile-nav" className="topbar__menu">
            <NavList active={current} onNavigate={go} />
            <div className="rail__block" style={{ borderBottom: 0 }}>
              <Socials />
            </div>
          </div>
        ) : null}
      </header>
    </>
  );
}
