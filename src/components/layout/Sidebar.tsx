"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { NAV_ITEMS } from "@/lib/navigation";
import { SOCIAL_ITEMS } from "@/lib/socials";
import { PROFILE } from "@/content/profile";
import ThemeToggle from "./ThemeToggle";

interface SidebarProps {
  /** Section that is highlighted until the scroll-spy reports a different one. */
  active?: string;
}

const SECTION_IDS = NAV_ITEMS.map((item) => item.href);

/** Wordmark: name with a solid border dot. */
function Brand() {
  return (
    <a
      href="#home"
      aria-label="Back to top"
      className="inline-flex items-baseline gap-[4px] text-lg tracking-tight"
      style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}
    >
      Marianne Napaño
      <span
        aria-hidden="true"
        className="inline-block h-[8px] w-[8px] rounded-full border border-[var(--ink)]"
        style={{ backgroundColor: "var(--ink)" }}
      />
    </a>
  );
}

/** The numbered list (1-7). Shared by the desktop rail and the mobile menu. */
function NavList({
  active,
  onNavigate,
  mobile = false,
}: {
  active: string;
  onNavigate: (href: string) => void;
  mobile?: boolean;
}) {
  return (
    <nav
      aria-label="Primary navigation"
      className="flex flex-col border-b border-[var(--gray-200)] py-5"
    >
      {NAV_ITEMS.map((item, index) => {
        const isActive = active === item.href;

        return (
          <a
            key={item.href}
            href={item.href}
            aria-current={isActive ? "location" : undefined}
            onClick={() => onNavigate(item.href)}
            className={`group relative flex items-baseline gap-[0.35rem] py-[0.45rem] text-[13px] leading-normal tracking-[0.2px] transition-colors ${
              mobile ? "rounded-md pr-3" : ""
            }`}
            style={{
              paddingLeft: "1.1rem",
              color: isActive ? "var(--ink)" : "var(--gray-500)",
              fontFamily: "var(--font-mono)",
            }}
          >
            <span
              aria-hidden="true"
              className={`absolute left-0 top-[0.45rem] text-sm transition-all duration-200 ${
                isActive ? "opacity-100" : "opacity-0 -translate-x-1 group-hover:translate-x-0 group-hover:opacity-100"
              }`}
            >
              {index + 1}
            </span>
            <span className="min-w-[1.5rem] text-[11px]" style={{ fontFamily: "var(--font-display)" }}>
              {item.label}
            </span>
          </a>
        );
      })}
    </nav>
  );
}

function Socials() {
  return (
    <ul className="flex items-center gap-3">
      {SOCIAL_ITEMS.map(({ label, href, Icon }) => (
        <li key={label}>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            title={label}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--gray-200)] text-[var(--gray-500)] transition-colors hover:text-[var(--ink)]"
          >
            <Icon size={15} />
          </a>
        </li>
      ))}
    </ul>
  );
}

/**
 * Site chrome: a fixed left rail from `lg` up, and a fixed top bar with a menu
 * below it (the 68px bar height is what `section[id]`'s scroll-margin in
 * theme.css assumes). Both read the same NAV_ITEMS. The highlighted item is
 * driven by an IntersectionObserver over the sections, not by a prop.
 */
export default function Sidebar({ active = "#home" }: SidebarProps) {
  const [current, setCurrent] = useState<string>(active);
  const [menuOpen, setMenuOpen] = useState(false);

  // Scroll-spy: the section crossing a band near the top third of the viewport.
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
        // Several can be inside the band at once; take the first in page order.
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

  // Escape closes the mobile menu.
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

  const resume = PROFILE.links.resume;

  return (
    <>
      {/* Desktop rail */}
      <aside
        className="fixed inset-y-0 left-0 z-30 hidden flex-col overflow-y-auto px-6 py-10 lg:flex"
        style={{ width: "var(--sidebar-w)" }}
      >
        <Brand />
        <p
          className="mt-2 text-[12px] leading-snug"
          style={{ color: "var(--gray-500)", fontFamily: "var(--font-mono)" }}
        >
          {PROFILE.headline}
        </p>

        <div className="mt-8">
          <NavList active={current} onNavigate={go} />
        </div>

        <div className="mt-auto flex flex-col gap-4 pt-8">
          {resume ? (
            <a
              href={resume}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-fit items-center rounded-full border border-[var(--gray-200)] px-3 py-1 text-[12px] text-[var(--gray-500)] transition-colors hover:text-[var(--ink)]"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              view resume
            </a>
          ) : null}
          <Socials />
          <div className="flex items-center justify-between">
            <ThemeToggle />
            <div className="flex items-center gap-2">
              <ThemeToggle compact />
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header
        className="fixed inset-x-0 top-0 z-40 lg:hidden"
        style={{ backgroundColor: "var(--bg)", borderBottom: "1px solid var(--gray-200)" }}
      >
        <div className="flex items-center justify-between px-5 py-4">
          <Brand />
          <div className="flex items-center gap-2">
            <ThemeToggle compact />
            <button
              type="button"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
              onClick={() => setMenuOpen((open) => !open)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--gray-200)] text-[var(--gray-500)] transition-colors hover:text-[var(--ink)]"
            >
              {menuOpen ? <X size={16} strokeWidth={1.7} /> : <Menu size={16} strokeWidth={1.7} />}
            </button>
          </div>
        </div>

        {menuOpen ? (
          <div id="mobile-nav" className="px-5 pb-4">
            <NavList active={current} onNavigate={go} mobile />
            <div className="pt-4">
              <Socials />
            </div>
          </div>
        ) : null}
      </header>
    </>
  );
}