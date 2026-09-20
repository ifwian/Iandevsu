"use client";

import { useEffect, useState } from "react";
import { Home, User, Layers, GraduationCap, FolderKanban, Newspaper, Sparkles, LucideIcon } from "lucide-react";
import GithubIcon from "@/components/icons/GithubIcon";
import ThemeToggle from "./ThemeToggle";

interface NavItem {
  href: string;
  label: string;
  Icon: LucideIcon | React.ComponentType<{ size?: number; strokeWidth?: number; style?: React.CSSProperties }>;
}

const NAV_ITEMS: NavItem[] = [
  { href: "#home", label: "home", Icon: Home },
  { href: "#about", label: "about", Icon: User },
  { href: "#projects", label: "projects", Icon: FolderKanban },
  { href: "#stack", label: "stack", Icon: Layers },
  { href: "#education", label: "education", Icon: GraduationCap },
  { href: "#life", label: "life", Icon: Sparkles },
  { href: "#github", label: "github", Icon: GithubIcon },
  { href: "#blog", label: "blog", Icon: Newspaper },
];

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
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex fixed left-0 top-0 h-screen w-56 flex-col px-6 py-8 z-40 border-r ${className}`}
        style={{ borderColor: "var(--gray-200)", backgroundColor: "var(--bg)" }}
      >
        <div className="mb-8 flex items-center justify-between">
          <a href="#home" className="text-lg lowercase" style={{ fontFamily: "var(--font-display)" }}>
            mrn<span style={{ color: "var(--gray-400)" }}>.</span>
          </a>
          <ThemeToggle />
        </div>

        <nav className="flex flex-col">
          {NAV_ITEMS.map((item) => {
            const isActive = active === item.href;
            return (
              <a
                key={item.href}
                href={item.href}
                className="group flex items-center gap-2.5 py-2.5 text-sm transition-colors"
                style={{
                  fontFamily: "var(--font-display)",
                  color: isActive ? "var(--ink)" : "var(--gray-400)",
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = "var(--ink)"; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = "var(--gray-400)"; }}
              >
                <item.Icon size={15} strokeWidth={1.8} style={{ flexShrink: 0 }} />
                {item.label}
              </a>
            );
          })}
        </nav>

        <p className="micro-label mt-auto">cs student</p>
      </aside>

      {/* Mobile Top Bar */}
      <header
        className="lg:hidden fixed inset-x-0 top-0 z-50 flex items-center justify-between border-b px-5 py-4 backdrop-blur"
        style={{ borderColor: "var(--gray-200)", backgroundColor: "color-mix(in srgb, var(--bg) 90%, transparent)" }}
      >
        <a href="#home" className="text-base lowercase" style={{ fontFamily: "var(--font-display)" }}>
          mrn<span style={{ color: "var(--gray-400)" }}>.</span>
        </a>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={open}
            className="flex h-9 w-9 items-center justify-center rounded-full border"
            style={{ borderColor: "var(--gray-200)" }}
          >
            <span className="flex flex-col gap-1">
              <span className="h-[1.5px] w-4" style={{ backgroundColor: "var(--ink)" }} />
              <span className="h-[1.5px] w-4" style={{ backgroundColor: "var(--ink)" }} />
            </span>
          </button>
        </div>
      </header>

      {/* Mobile Overlay Menu */}
      <div
        className={`lg:hidden fixed inset-0 z-60 flex flex-col transition-opacity duration-300 ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        style={{ backgroundColor: "var(--bg)" }}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-5 py-4">
          <span className="text-base lowercase" style={{ fontFamily: "var(--font-display)" }}>
            mrn<span style={{ color: "var(--gray-400)" }}>.</span>
          </span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close navigation menu"
            className="flex h-9 w-9 items-center justify-center rounded-full border"
            style={{ borderColor: "var(--gray-200)" }}
          >
            <span className="font-mono text-sm" style={{ color: "var(--ink)" }}>
              esc
            </span>
          </button>
        </div>

        <nav className="flex flex-1 flex-col justify-center gap-1 px-5">
          {NAV_ITEMS.map((item) => {
            const isActive = active === item.href;
            return (
              <a
                key={item.href}
                href={item.href}
                className="group flex items-center gap-2.5 py-2 text-sm transition-colors"
                style={{
                  fontFamily: "var(--font-display)",
                  color: isActive ? "var(--ink)" : "var(--gray-400)",
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = "var(--ink)"; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = "var(--gray-400)"; }}
                onClick={() => setOpen(false)}
              >
                <item.Icon size={20} strokeWidth={1.8} style={{ flexShrink: 0 }} />
                {item.label}
              </a>
            );
          })}
        </nav>

        <div className="flex items-center justify-between px-5 py-6">
          <p className="micro-label">cs student</p>
        </div>
      </div>
    </>
  );
} 
