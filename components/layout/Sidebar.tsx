"use client";

import { useEffect, useState } from "react";
import { Mail, MapPin } from "lucide-react";
import { PROFILE } from "@/content/profile";
import ChatWithIan from "@/components/chat/ChatWithIan";
import ThemeToggle from "./ThemeToggle";

interface NavItem {
  href: string;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: "#home", label: "home" },
  { href: "#about", label: "about" },
  { href: "#projects", label: "projects" },
  { href: "#stack", label: "stack" },
  { href: "#education", label: "education" },
  { href: "#life", label: "life" },
  { href: "#github", label: "github" },
  { href: "#blog", label: "blog" },
];

interface SidebarNavProps {
  active: string;
  mobile?: boolean;
  onNavigate?: () => void;
}

function SidebarNav({ active, mobile = false, onNavigate }: SidebarNavProps) {
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
            // "location" is the accurate value for in-page navigation and
            // styles the same as the reference's generic [aria-current].
            aria-current={isActive ? "location" : undefined}
            onClick={onNavigate}
            className={`group relative flex items-baseline gap-[0.35rem] py-[0.45rem] text-[13px] leading-normal tracking-[0.2px] transition-colors ${
              mobile ? "rounded-md pr-3" : ""
            }`}
            style={{
              // Room for the arrow, which is taken out of flow below.
              paddingLeft: "1.1rem",
              color: isActive ? "var(--ink)" : "var(--gray-500)",
              fontFamily: "var(--font-mono)",
            }}
          >
            {/* Absolutely positioned so it never shifts the label, and revealed
                on hover as well as on the active item. */}
            <span
              aria-hidden="true"
              className={`absolute left-0 top-[0.45rem] text-sm transition-all duration-200 ${
                isActive ? "opacity-100" : "opacity-0 -translate-x-1 group-hover:translate-x-0 group-hover:opacity-100"
              }`}
            >
              →
            </span>
            <span
              className="min-w-[1.5rem] text-[11px]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <span>{item.label}</span>
          </a>
        );
      })}
    </nav>
  );
}

function SidebarIdentity() {
  return (
    <>
      {/* Group 1: profile. No top padding, matching the reference's
          `.sidebar__group:first-child` rule -- the aside's own padding
          supplies that space. */}
      <div className="border-b border-[var(--gray-200)] pb-5">
        <a
          href="#home"
          className="block text-[1.05rem] leading-none lowercase"
          style={{ fontFamily: "var(--font-display)" }}
        >
          marianne napaño
        </a>
        <p
          className="mt-[0.6rem] pt-[0.2rem] text-[11px] uppercase leading-[1.4]"
          style={{ color: "var(--gray-500)", letterSpacing: "1px", fontFamily: "var(--font-mono)" }}
        >
          BSCS · COMPUTER SCIENCE
        </p>
      </div>

      {/* Group 2: location. */}
      <div
        className="flex items-center gap-[0.45rem] border-b border-[var(--gray-200)] py-5 text-[12px] leading-[1.5]"
        style={{ color: "var(--gray-500)", fontFamily: "var(--font-mono)" }}
      >
        <MapPin size={14} strokeWidth={1.7} className="shrink-0" />
        <span>calamba · laguna · ph</span>
      </div>
    </>
  );
}

/**
 * The contact block. Replaces the social icon row the reference layout has
 * here; GitHub/LinkedIn/Instagram still live in the hero, so nothing became
 * unreachable. Sits directly below the last group, which is why it carries no
 * separator of its own.
 */
function SidebarContact() {
  return (
    <div className="flex flex-col items-center gap-3">
      {/* Full three-way control (system / light / dark, defaulting to system)
          rather than the single-button toggle, which is the design language's
          documented pattern. */}
      <ThemeToggle />

      <p
        className="max-w-[28ch] text-center text-[11px] leading-[1.5]"
        style={{
          color: "var(--gray-500)",
          letterSpacing: "1px",
          fontFamily: "var(--font-mono)",
        }}
      >
        For work, collabs &amp; everything else, reach me at
      </p>

      {/* The address is the actionable element, so the rule is drawn faintly and
          strengthens on hover, per the link treatment in the design language. */}
      <a
        href={`mailto:${PROFILE.links.email}`}
        className="inline-flex items-center gap-2 text-[12px] underline decoration-dotted decoration-[var(--gray-300)] underline-offset-[3px] transition-colors hover:text-[var(--ink)] hover:decoration-[var(--ink)]"
        style={{ color: "var(--gray-500)", fontFamily: "var(--font-mono)" }}
      >
        <Mail size={13} strokeWidth={1.7} className="shrink-0" />
        <span>{PROFILE.links.email}</span>
      </a>
    </div>
  );
}

/** The chat trigger, grouped like every other section. */
function SidebarActions({ className = "" }: { className?: string }) {
  return (
    <div className={`border-b border-[var(--gray-200)] py-5 ${className}`.trim()}>
      <ChatWithIan variant="sidebar" />
    </div>
  );
}

function SidebarMobileFooter() {
  return (
    <div className="mt-6">
      <SidebarActions className="border-b-0 pb-0" />
      <div className="pt-5">
        <SidebarContact />
      </div>
    </div>
  );
}

interface SidebarProps {
  className?: string;
}

export default function Sidebar({ className = "" }: SidebarProps) {
  const [active, setActive] = useState<string>("#home");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const sections = NAV_ITEMS.map((item) => document.querySelector(item.href)).filter(
      (el): el is Element => Boolean(el)
    );
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setActive(`#${visible.target.id}`);
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: [0, 0.25, 0.5, 1] }
    );

    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <aside
        className={`hidden lg:flex fixed left-0 top-0 z-40 h-screen flex-col overflow-hidden border-r px-7 pb-6 pt-7 ${className}`}
        style={{
          width: "var(--sidebar-w)",
          borderColor: "var(--gray-200)",
          backgroundColor: "var(--bg)",
        }}
      >
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <SidebarIdentity />
          <SidebarNav active={active} />
          <SidebarActions />
        </div>
        {/* `mt-auto` pins the contact block to the bottom of the flex column,
            mirroring the reference's `.sidebar__foot`. */}
        <div className="mt-auto shrink-0 pt-5">
          <SidebarContact />
        </div>
      </aside>

      <div className="fixed inset-x-0 top-0 z-50 lg:hidden">
        <header
          className="flex items-center justify-between border-b border-[var(--gray-200)] px-5 py-4 backdrop-blur"
          style={{ backgroundColor: "color-mix(in srgb, var(--bg) 90%, transparent)" }}
        >
          <a
            href="#home"
            className="text-sm lowercase"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            marianne napaño
          </a>

          <div className="flex items-center gap-3">
            <ThemeToggle compact />
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpen(!open)}
                aria-label="Toggle navigation menu"
                aria-expanded={open}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--gray-200)]"
              >
                <span className="flex flex-col items-center justify-center gap-[5px]">
                  <span
                    className={`h-[1.5px] w-5 rounded transition-all duration-300 ${
                      open ? "translate-y-[3.5px] rotate-45" : ""
                    }`}
                    style={{ backgroundColor: "var(--ink)" }}
                  />
                  <span
                    className={`h-[1.5px] w-5 rounded transition-all duration-300 ${
                      open ? "opacity-0" : ""
                    }`}
                    style={{ backgroundColor: "var(--ink)" }}
                  />
                  <span
                    className={`h-[1.5px] w-5 rounded transition-all duration-300 ${
                      open ? "-translate-y-[3.5px] -rotate-45" : ""
                    }`}
                    style={{ backgroundColor: "var(--ink)" }}
                  />
                </span>
              </button>

              <div
                 className={`absolute right-0 top-full mt-2 max-h-[calc(100vh-5rem)] w-72 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-xl border border-[var(--gray-200)] p-5 shadow-lg transition-all duration-200 ${
                  open
                    ? "pointer-events-auto origin-top-right scale-100 opacity-100"
                    : "pointer-events-none origin-top-right scale-95 opacity-0"
                }`}
                style={{ backgroundColor: "var(--bg)" }}
                role="dialog"
                aria-label="Navigation menu"
              >
                <SidebarIdentity />
                <SidebarNav
                  active={active}
                  mobile
                  onNavigate={() => setOpen(false)}
                />
                <SidebarMobileFooter />
              </div>
            </div>
          </div>
        </header>
      </div>
    </>
  );
}
